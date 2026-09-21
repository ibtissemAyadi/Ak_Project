"""Génération du PDF d'un devis — deux pages construites avec reportlab
(pure Python, aucune dépendance système requise sous Windows) :

  Page 1 — Devis de service : en-tête société, informations devis/client,
  tableau des lignes (avec TVA et total par ligne), récapitulatif des
  montants.
  Page 2 — Conditions générales de vente (CGV), texte juridique fixe.

Même thème visuel (palette, police, formatage) que le PDF facture — voir
pdf_theme.py, point de vérité unique pour que les deux documents restent
cohérents.

Les montants affichés proviennent exclusivement des champs déjà calculés et
stockés par Devis.recalculer_montants() : ce module ne refait aucun calcul
de fond, il se contente de mettre en forme les valeurs — évite toute
divergence avec les montants affichés dans l'application."""

import io
from decimal import Decimal

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from .pdf_theme import (
    COMPANY_ADDRESS,
    COMPANY_EMAIL,
    COMPANY_NAME_CONTACT,
    COMPANY_NAME_FOOTER,
    COMPANY_PHONE,
    COULEUR_BORDURE,
    COULEUR_FOND_ALT,
    COULEUR_FOND_TOTAL,
    COULEUR_PRINCIPALE,
    COULEUR_TEXTE_ATTENUE,
    FONT_BOLD,
    FONT_REGULAR,
    LOGO_PATH,
    entete_tableau,
    formater_date_longue,
    formater_montant,
    formater_nombre,
    style_a_client,
    style_bold,
    style_cgv_body,
    style_cgv_heading,
    style_champ_droite,
    style_droite,
    style_droite_muted,
    style_muted,
    style_normal,
    style_section,
    style_titre,
    style_titre_page,
)


def _en_tete(devis):
    """Bandeau du haut : logo à gauche, titre "Devis" à droite."""
    if LOGO_PATH.exists():
        logo = Image(str(LOGO_PATH), width=2.3 * cm, height=2.0 * cm)
    else:
        logo = Paragraph('', style_normal)

    titre = Paragraph('Devis', style_titre)

    entete = Table([[logo, titre]], colWidths=[7 * cm, 10.6 * cm])
    entete.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    return entete


def _bloc_contact_devis(devis):
    """Bloc sous le bandeau : coordonnées société à gauche, Date / N° de
    devis / Référence client à droite. Même traitement que le bloc
    équivalent de la facture (nom en gras, reste en gris atténué) — pas de
    couleurs d'accent secondaires."""
    colonne_gauche = [
        Paragraph(COMPANY_NAME_CONTACT, style_bold),
        Paragraph(COMPANY_ADDRESS, style_muted),
        Paragraph(COMPANY_PHONE, style_muted),
        Paragraph(COMPANY_EMAIL, style_muted),
    ]
    colonne_droite = [
        Paragraph(f'<b>Date :</b> {formater_date_longue(devis.date_creation)}', style_champ_droite),
        Paragraph(f'<b>N° de devis :</b> {devis.numero} (v{devis.version})', style_champ_droite),
        Paragraph(f'<b>Référence client :</b> {devis.client.matricule_fiscal or "—"}', style_champ_droite),
    ]

    table = Table([[colonne_gauche, colonne_droite]], colWidths=[9.6 * cm, 8 * cm])
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    return table


def _bloc_client(devis):
    """Ligne "À : <client>" + son adresse (même présentation que le bloc
    client de la facture) — la prestation (objet du devis) est affichée en
    ligne de titre du tableau des lignes (voir _tableau_lignes), pas ici, pour
    que tout le détail du projet vive dans un seul tableau cohérent."""
    client = devis.client
    coordonnees = ' · '.join(filter(None, [client.adresse, client.pays]))
    elements = [Paragraph(f'<b>À :</b> {client.raison_sociale}', style_a_client)]
    if coordonnees:
        elements.append(Paragraph(coordonnees, style_muted))
    return elements


def _style_tableau_lignes(nb_lignes, colonnes_droite):
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), COULEUR_PRINCIPALE),
        # Grille complète (lignes ET colonnes séparées) pour un tableau bien
        # structuré et lisible, avec un cadre extérieur plus marqué et une
        # ligne d'en-tête accentuée par-dessus.
        ('INNERGRID', (0, 0), (-1, -1), 0.5, COULEUR_BORDURE),
        ('BOX', (0, 0), (-1, -1), 0.75, COULEUR_PRINCIPALE),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, COULEUR_PRINCIPALE),
        # Ligne 1 (titre du projet, sous l'en-tête) : fond distinct + trait
        # de séparation pour la démarquer des lignes de prestation réelles.
        ('BACKGROUND', (0, 1), (-1, 1), COULEUR_FOND_TOTAL),
        ('LINEBELOW', (0, 1), (-1, 1), 0.5, COULEUR_PRINCIPALE),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]
    for col in colonnes_droite:
        style.append(('ALIGN', (col, 0), (col, -1), 'RIGHT'))
    for i in range(2, nb_lignes + 2):
        if i % 2 == 0:
            style.append(('BACKGROUND', (0, i), (-1, i), COULEUR_FOND_ALT))
    return TableStyle(style)


def _facteur_marge(devis) -> Decimal:
    """Ratio à appliquer au prix/montant de chaque ligne pour que le prix
    affiché sur le PDF intègre déjà la marge et la remise du devis (au lieu
    de les laisser en ajustement global invisible, qui produit un écart
    inexpliqué entre "Sous-total" et "Total" sur le document client)."""
    if not devis.sous_total:
        return Decimal('1')
    return devis.montant_ht / devis.sous_total


def _tableau_lignes(devis):
    lignes = list(devis.lignes.all())
    if not lignes:
        return Paragraph('Aucune ligne.', style_muted)

    facteur = _facteur_marge(devis)

    # La première ligne du tableau (sous l'en-tête des colonnes) porte le
    # titre du projet, dans la même structure de colonnes que les lignes de
    # prestation qui suivent — pas une bannière fusionnée à part.
    # Pas de colonne TVA / Sous-total par ligne : le PDF ne détaille pas la
    # TVA (voir _tableau_totaux) — juste la description, quantité, prix et
    # total de chaque ligne.
    data = [
        entete_tableau(['Description', 'Quantité', 'Prix', 'Total']),
        [Paragraph(devis.objet or 'Prestation', style_bold), '—', '—', '—'],
    ]
    for l in lignes:
        prix_affiche = (l.prix_unitaire * facteur).quantize(Decimal('0.01')) if l.prix_unitaire is not None else None
        montant_affiche = (l.montant * facteur).quantize(Decimal('0.01'))
        data.append([
            Paragraph(l.description, style_normal),
            Paragraph(formater_nombre(l.quantite) if l.quantite is not None else '—', style_droite),
            Paragraph(formater_montant(prix_affiche) if prix_affiche is not None else '—', style_droite),
            Paragraph(formater_montant(montant_affiche), style_droite),
        ])
    table = Table(data, colWidths=[7.4 * cm, 2.2 * cm, 3.4 * cm, 3.6 * cm], repeatRows=2)
    table.setStyle(_style_tableau_lignes(len(lignes), colonnes_droite=[1, 2, 3]))
    return table


def _tableau_totaux(devis):
    # Ni marge, ni remise, ni TVA détaillées dans le PDF généré : la marge et
    # la remise sont déjà réparties dans le prix de chaque ligne (voir
    # _facteur_marge), donc ce "Sous-total" est le montant HT une fois ces
    # ajustements intégrés — pas le sous-total brut des lignes avant marge.
    # Ces montants restent visibles/modifiables séparément dans l'application,
    # simplement pas détaillés sur ce document destiné au client.
    lignes = [
        ('Sous-total', formater_montant(devis.montant_ht), False),
        ('Total', formater_montant(devis.montant_ttc), True),
    ]
    data = []
    style_cmds = [
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
    ]
    for i, (label, valeur, accent) in enumerate(lignes):
        style_label = style_bold if accent else style_muted
        style_valeur = style_droite if accent else style_droite_muted
        data.append([Paragraph(label, style_label), Paragraph(valeur, style_valeur)])
        if accent:
            style_cmds.append(('LINEABOVE', (0, i), (-1, i), 0.75, COULEUR_BORDURE))

    # Total final mis en évidence
    data[-1][0] = Paragraph('<b>Total</b>', ParagraphStyle('totL', parent=style_bold, fontSize=11.5))
    data[-1][1] = Paragraph(f'<b>{lignes[-1][1]}</b>', ParagraphStyle('totV', parent=style_droite, fontSize=11.5))
    style_cmds.append(('BACKGROUND', (0, len(lignes) - 1), (-1, len(lignes) - 1), COULEUR_FOND_TOTAL))
    style_cmds.append(('TOPPADDING', (0, len(lignes) - 1), (-1, len(lignes) - 1), 8))
    style_cmds.append(('BOTTOMPADDING', (0, len(lignes) - 1), (-1, len(lignes) - 1), 8))

    table = Table(data, colWidths=[5.5 * cm, 4.5 * cm], hAlign='RIGHT')
    table.setStyle(TableStyle(style_cmds))
    return table


# ---------------------------------------------------------------------------
# Page 2 — Conditions générales de vente (texte fixe)
# ---------------------------------------------------------------------------

CGV_INTRO = [
    "Le présent devis est soumis aux Conditions Générales de Vente de A and K Conseil et Ingénierie, "
    "qui en constituent une partie intégrante.",
    "L’acceptation du présent devis par le Client, par signature, retour signé par voie électronique, "
    "émission d’un bon de commande faisant référence au présent devis, versement d’un acompte ou "
    "confirmation écrite de la commande, vaut acceptation pleine, entière et sans réserve du présent "
    "devis ainsi que des Conditions Générales de Vente de A and K Conseil et Ingénierie.",
]

CGV_SECTIONS = [
    ('Validité du devis', [
        "Le présent devis est valable pendant une durée de 30 jours à compter de sa date d’émission, "
        "sauf indication contraire mentionnée dans le devis. Au-delà de cette période, les prix et "
        "conditions proposés pourront être révisés.",
    ]),
    ('Périmètre des prestations', [
        "Les prestations sont strictement limitées au périmètre, aux livrables et aux hypothèses "
        "expressément définis dans le présent devis. Toute prestation, réunion, étude, modification, "
        "variante ou livrable non expressément mentionné est considéré comme hors périmètre et pourra "
        "faire l’objet d’une facturation complémentaire.",
    ]),
    ('Documents et données fournis par le Client', [
        "Le Client est responsable de l’exactitude, de la cohérence, de l’exhaustivité et de "
        "l’actualité des documents, données et informations transmis à A and K Conseil et Ingénierie. "
        "Toute modification ou information nouvelle susceptible d’avoir une incidence sur les études "
        "pourra entraîner une révision du prix et du délai.",
    ]),
    ('Modifications et prestations supplémentaires', [
        "Toute modification du besoin initial, des données d’entrée, des plans, des hypothèses, des "
        "équipements, des normes ou des exigences du projet, ainsi que toute demande supplémentaire du "
        "Client, de son client final, d’un bureau de contrôle ou de tout autre intervenant, pourra faire "
        "l’objet d’une facturation complémentaire et d’un ajustement du délai. Aucune prestation "
        "supplémentaire ne sera exécutée sans accord préalable sur ses conditions.",
    ]),
    ('Délais', [
        "Les délais indiqués dans le présent devis commencent à courir à compter de la réception de la "
        "commande, de l’acompte lorsqu’il est prévu, et de l’ensemble des documents et informations "
        "nécessaires à l’exécution de la mission. Tout retard dans la transmission des éléments "
        "nécessaires, toute absence de validation ou toute modification du périmètre entraîne "
        "automatiquement un report du délai.",
    ]),
    ('Révisions et validation des livrables', [
        "Sauf indication contraire dans le présent devis, un cycle de révision est inclus dans le prix. "
        "Les révisions incluses concernent exclusivement les corrections nécessaires à la conformité des "
        "livrables avec le périmètre initialement convenu. Toute modification du projet ou demande "
        "nouvelle est considérée comme une prestation supplémentaire.",
        "Le Client dispose de 5 jours ouvrés à compter de la réception d’un livrable pour formuler par "
        "écrit toute observation précise et motivée. À défaut de retour dans ce délai, le livrable est "
        "réputé accepté.",
    ]),
    ('Prix et paiement', [
        "Les prix sont indiqués en euros hors taxes, sauf indication contraire. Les modalités de "
        "paiement et les échéances sont celles indiquées dans le présent devis.",
        "Tout retard de paiement entraîne l’application des pénalités de retard et indemnités "
        "éventuellement exigibles conformément à la réglementation applicable. En cas de retard de "
        "paiement, A and K Conseil et Ingénierie se réserve le droit de suspendre immédiatement les "
        "prestations et la remise des livrables jusqu’au règlement intégral des sommes dues.",
    ]),
    ('Propriété intellectuelle', [
        "Les méthodes, modèles, gabarits, bibliothèques, familles BIM, scripts, outils, fichiers de "
        "travail, modèles de calcul, savoir-faire et autres éléments préexistants ou génériques "
        "utilisés par A and K Conseil et Ingénierie demeurent sa propriété exclusive.",
        "Après règlement intégral des sommes dues, le Client bénéficie d’un droit d’utilisation des "
        "livrables exclusivement pour le projet identifié dans le présent devis. Sauf accord écrit "
        "contraire, les fichiers sources et fichiers natifs ne sont pas compris dans les livrables.",
    ]),
    ('Responsabilité', [
        "A and K Conseil et Ingénierie est tenue à une obligation de moyens. Sa responsabilité ne "
        "pourra être engagée que pour les dommages directs résultant d’une faute qui lui est "
        "directement imputable.",
        "Dans toute la mesure permise par la réglementation applicable, la responsabilité totale de "
        "A and K Conseil et Ingénierie, toutes causes et tous dommages confondus, est limitée au "
        "montant hors taxes effectivement encaissé au titre de la mission concernée.",
    ]),
    ('Exécution et utilisation des livrables', [
        "Sauf prestation expressément prévue dans le présent devis, A and K Conseil et Ingénierie "
        "n’assure ni la direction, ni la supervision, ni le contrôle de l’exécution des travaux, ni la "
        "vérification de la conformité de la réalisation sur site.",
        "Le Client demeure responsable de l’utilisation des livrables, de leur transmission aux tiers "
        "et de leur intégration dans son projet.",
    ]),
    ('Confidentialité', [
        "Les parties s’engagent à conserver confidentielles les informations techniques, commerciales "
        "et financières échangées dans le cadre de la mission, sous réserve des obligations légales ou "
        "contractuelles applicables.",
    ]),
    ('Résiliation', [
        "En cas d’arrêt ou de résiliation de la mission à l’initiative du Client, les prestations "
        "réalisées jusqu’à la date effective de résiliation, ainsi que les frais et engagements "
        "engagés par A and K Conseil et Ingénierie, restent intégralement dus.",
    ]),
    ('Conditions Générales de Vente', [
        "Les présentes dispositions sont complétées par les Conditions Générales de Vente de A and K "
        "Conseil et Ingénierie, annexées au présent devis. En cas de contradiction, les dispositions "
        "particulières expressément mentionnées dans le présent devis prévalent sur les CGV, sauf "
        "stipulation contraire.",
    ]),
    ('ACCEPTATION DU DEVIS', [
        "La signature du présent devis vaut acceptation pleine, entière et sans réserve du devis, de "
        "ses conditions particulières et des Conditions Générales de Vente de A and K Conseil et "
        "Ingénierie.",
    ]),
]


def _page_cgv(devis):
    elements = [
        PageBreak(),
        _en_tete(devis),
        Spacer(1, 0.6 * cm),
        HRFlowable(width='100%', thickness=0.75, color=COULEUR_BORDURE),
        Spacer(1, 0.5 * cm),
        Paragraph('CONDITIONS GÉNÉRALES DE VENTE', style_titre_page),
    ]
    for texte in CGV_INTRO:
        elements.append(Paragraph(texte, style_cgv_body))

    for titre, paragraphes in CGV_SECTIONS:
        elements.append(Paragraph(titre, style_cgv_heading))
        for texte in paragraphes:
            elements.append(Paragraph(texte, style_cgv_body))

    return elements


def _pied_de_page(devis):
    def dessiner(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(COULEUR_BORDURE)
        canvas.line(2 * cm, 1.7 * cm, A4[0] - 2 * cm, 1.7 * cm)
        canvas.setFont(FONT_BOLD, 8)
        canvas.setFillColor(COULEUR_PRINCIPALE)
        canvas.drawCentredString(A4[0] / 2, 1.35 * cm, 'Nous vous remercions de votre confiance !')
        canvas.setFont(FONT_REGULAR, 7.5)
        canvas.setFillColor(COULEUR_TEXTE_ATTENUE)
        canvas.drawCentredString(A4[0] / 2, 1.05 * cm, f'{COMPANY_NAME_FOOTER}  {COMPANY_ADDRESS}')
        canvas.drawRightString(A4[0] - 2 * cm, 1.35 * cm, f'Page {doc.page}')
        canvas.restoreState()
    return dessiner


def generer_devis_pdf(devis) -> bytes:
    tampon = io.BytesIO()
    doc = SimpleDocTemplate(
        tampon, pagesize=A4,
        topMargin=2 * cm, bottomMargin=2.4 * cm, leftMargin=2 * cm, rightMargin=2 * cm,
        title=f'Devis {devis.numero} v{devis.version}',
    )

    elements = [
        _en_tete(devis),
        Spacer(1, 0.4 * cm),
        HRFlowable(width='100%', thickness=1, color=COULEUR_PRINCIPALE),
        Spacer(1, 0.4 * cm),
        _bloc_contact_devis(devis),
        Spacer(1, 0.4 * cm),
        HRFlowable(width='100%', thickness=1, color=COULEUR_PRINCIPALE),
        Spacer(1, 0.4 * cm),
        *_bloc_client(devis),
        Spacer(1, 0.6 * cm),
        Paragraph('Lignes', style_section),
        _tableau_lignes(devis),
        Spacer(1, 0.6 * cm),
        _tableau_totaux(devis),
    ]

    if devis.commentaire_justification:
        elements += [
            Spacer(1, 0.6 * cm),
            Paragraph('Commentaire / justification', style_section),
            Paragraph(devis.commentaire_justification, style_normal),
        ]

    elements += _page_cgv(devis)

    pied = _pied_de_page(devis)
    doc.build(elements, onFirstPage=pied, onLaterPages=pied)
    return tampon.getvalue()
