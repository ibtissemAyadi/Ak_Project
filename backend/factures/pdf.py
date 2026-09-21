"""Génération du PDF d'une facture — même moteur (reportlab) et même thème
visuel que le devis (voir backend/devis/pdf_theme.py), avec la structure
propre à une facture : bloc TVA société, informations de paiement,
coordonnées bancaires.

Les montants proviennent exclusivement des champs stockés par
Facture.recalculer_montants() — ce module ne fait que les mettre en forme."""

import io

from PIL import Image as PILImage

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from devis.pdf_theme import (
    COMPANY_ADDRESS,
    COMPANY_EMAIL,
    COMPANY_NAME_CONTACT,
    COMPANY_VAT_ID,
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
    style_champ_droite,
    style_droite,
    style_droite_muted,
    style_muted,
    style_normal,
    style_section,
    style_titre,
)

from .models import MODE_REGLEMENT_CHOICES

BANQUE_NOM = 'UIB – Union Internationale de Banque'
BANQUE_IBAN = 'TN59 12 206 00 00055002674 77'
BANQUE_BIC = 'UIBKTNTT'

MODE_REGLEMENT_LABELS = dict(MODE_REGLEMENT_CHOICES)


def _en_tete():
    if LOGO_PATH.exists():
        logo = Image(str(LOGO_PATH), width=2.3 * cm, height=2.0 * cm)
    else:
        logo = Paragraph('', style_normal)
    titre = Paragraph('Facture', style_titre)
    entete = Table([[logo, titre]], colWidths=[7 * cm, 10.6 * cm])
    entete.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    return entete


def _bloc_entreprise_facture(facture):
    colonne_gauche = [
        Paragraph(COMPANY_NAME_CONTACT, style_bold),
        Paragraph(COMPANY_ADDRESS, style_muted),
        Paragraph(f'Identifiant TVA : {COMPANY_VAT_ID}', style_muted),
        Paragraph(COMPANY_EMAIL, style_muted),
    ]
    affaire = facture.affaire
    colonne_droite = [
        Paragraph(f'<b>Date :</b> {formater_date_longue(facture.date_facture)}', style_champ_droite),
        Paragraph(f'<b>Numéro de facture :</b> {facture.numero_facture}', style_champ_droite),
        Paragraph(f'<b>Référence client :</b> {affaire.client.matricule_fiscal or "—"}', style_champ_droite),
    ]
    table = Table([[colonne_gauche, colonne_droite]], colWidths=[9.6 * cm, 8 * cm])
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    return table


def _bloc_client(facture):
    client = facture.affaire.client
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
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
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


def _tableau_prestations(facture):
    lignes = list(facture.lignes.all())
    if not lignes:
        return Paragraph('Aucune ligne.', style_muted)

    objet = facture.affaire.devis.objet
    # La première ligne du tableau (sous l'en-tête des colonnes) porte le
    # titre du projet facturé, dans la même structure de colonnes que les
    # lignes de prestation qui suivent — pas une bannière fusionnée à part.
    data = [
        # Ordre demandé : Quantité, Description, Prix unitaire, Total.
        entete_tableau(['Quantité', 'Description', 'Prix unitaire', 'Total']),
        ['—', Paragraph(objet or 'Prestation', style_bold), '—', '—'],
    ]
    for l in lignes:
        data.append([
            Paragraph(formater_nombre(l.quantite) if l.quantite is not None else '—', style_droite),
            Paragraph(l.description, style_normal),
            Paragraph(formater_montant(l.prix_unitaire) if l.prix_unitaire is not None else '—', style_droite),
            Paragraph(formater_montant(l.montant), style_droite),
        ])
    table = Table(data, colWidths=[2.2 * cm, 7.4 * cm, 3.4 * cm, 3.6 * cm], repeatRows=2)
    table.setStyle(_style_tableau_lignes(len(lignes), colonnes_droite=[0, 2, 3]))
    return table


def _tableau_totaux(facture):
    lignes = [
        ('Sous-total', formater_montant(facture.sous_total), False),
        ('TVA', formater_montant(facture.montant_tva), False),
        ('Total', formater_montant(facture.montant_total), True),
    ]
    data = []
    style_cmds = [
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
    ]
    for i, (label, valeur, accent) in enumerate(lignes):
        style_label = style_bold if accent else style_muted
        style_valeur = style_droite if accent else style_droite_muted
        data.append([Paragraph(label, style_label), Paragraph(valeur, style_valeur)])
        if accent:
            style_cmds.append(('LINEABOVE', (0, i), (-1, i), 0.75, COULEUR_BORDURE))

    data[-1][0] = Paragraph('<b>Total</b>', ParagraphStyle('totL', parent=style_bold, fontSize=11.5))
    data[-1][1] = Paragraph(f'<b>{lignes[-1][1]}</b>', ParagraphStyle('totV', parent=style_droite, fontSize=11.5))
    style_cmds.append(('BACKGROUND', (0, len(lignes) - 1), (-1, len(lignes) - 1), COULEUR_FOND_TOTAL))
    style_cmds.append(('TOPPADDING', (0, len(lignes) - 1), (-1, len(lignes) - 1), 5))
    style_cmds.append(('BOTTOMPADDING', (0, len(lignes) - 1), (-1, len(lignes) - 1), 5))

    table = Table(data, colWidths=[5.5 * cm, 4.5 * cm], hAlign='RIGHT')
    table.setStyle(TableStyle(style_cmds))
    return table


def _tableau_info(lignes):
    """Tableau label/valeur bien structuré (bordures complètes, colonne de
    label teintée) — utilisé pour les blocs Informations de paiement et
    Coordonnées bancaires, pour qu'ils se lisent comme un vrai tableau plutôt
    que des paires de texte flottantes."""
    data = [[Paragraph(label, style_bold), Paragraph(str(valeur), style_normal)] for label, valeur in lignes]
    table = Table(data, colWidths=[5.5 * cm, 11.5 * cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), COULEUR_FOND_ALT),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, COULEUR_BORDURE),
        ('BOX', (0, 0), (-1, -1), 0.75, COULEUR_PRINCIPALE),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    return table


def _bloc_paiement(facture):
    return _tableau_info([
        ('À payer', formater_montant(facture.montant_a_payer)),
        ('Mode de règlement', MODE_REGLEMENT_LABELS.get(facture.mode_reglement, facture.mode_reglement)),
        ('Conditions de paiement', facture.label_echeance),
        ("Date d'échéance", formater_date_longue(facture.date_echeance)),
    ])


def _bloc_bancaire():
    return _tableau_info([
        ('Banque', BANQUE_NOM),
        ('IBAN', BANQUE_IBAN),
        ('BIC', BANQUE_BIC),
    ])


def _bloc_signature(facture):
    """Image de la signature électronique, mise à l'échelle pour tenir dans
    un encadré compact tout en gardant ses proportions d'origine — alignée à
    gauche, au-dessus des tableaux (juste après le bloc client)."""
    largeur_max, hauteur_max = 3.2 * cm, 1.3 * cm
    with facture.signature.open('rb') as f:
        largeur_px, hauteur_px = PILImage.open(f).size
    ratio = min(largeur_max / largeur_px, hauteur_max / hauteur_px, 1)
    image = Image(facture.signature.path, width=largeur_px * ratio, height=hauteur_px * ratio)
    image.hAlign = 'LEFT'
    titre = Paragraph('Signature', ParagraphStyle('SignatureTitre', parent=style_section, fontSize=9.5, spaceBefore=0, spaceAfter=2))
    return [titre, image]


def _pied_de_page():
    def dessiner(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(COULEUR_BORDURE)
        canvas.line(2 * cm, 1.7 * cm, A4[0] - 2 * cm, 1.7 * cm)
        canvas.setFont(FONT_BOLD, 8)
        canvas.setFillColor(COULEUR_PRINCIPALE)
        canvas.drawCentredString(A4[0] / 2, 1.35 * cm, 'Nous vous remercions de votre confiance !')
        canvas.setFont(FONT_REGULAR, 7.5)
        canvas.setFillColor(COULEUR_TEXTE_ATTENUE)
        canvas.drawCentredString(A4[0] / 2, 1.05 * cm, f'{COMPANY_NAME_CONTACT}  {COMPANY_ADDRESS}')
        canvas.drawRightString(A4[0] - 2 * cm, 1.35 * cm, f'Page {doc.page}')
        canvas.restoreState()
    return dessiner


def generer_facture_pdf(facture) -> bytes:
    tampon = io.BytesIO()
    marge_horizontale = 2 * cm
    marge_haute = 1.3 * cm
    marge_basse = 1.9 * cm
    doc = SimpleDocTemplate(
        tampon, pagesize=A4,
        topMargin=marge_haute, bottomMargin=marge_basse, leftMargin=marge_horizontale, rightMargin=marge_horizontale,
        title=facture.numero_facture,
    )

    elements = [
        _en_tete(),
        Spacer(1, 0.2 * cm),
        HRFlowable(width='100%', thickness=1, color=COULEUR_PRINCIPALE),
        Spacer(1, 0.2 * cm),
        _bloc_entreprise_facture(facture),
        Spacer(1, 0.2 * cm),
        HRFlowable(width='100%', thickness=1, color=COULEUR_PRINCIPALE),
        Spacer(1, 0.2 * cm),
        *_bloc_client(facture),
        Spacer(1, 0.3 * cm),
        Paragraph('Prestations', style_section),
        _tableau_prestations(facture),
        Spacer(1, 0.3 * cm),
        _tableau_totaux(facture),
        Spacer(1, 0.35 * cm),
        KeepTogether([Paragraph('Informations de paiement', style_section), _bloc_paiement(facture)]),
        Spacer(1, 0.3 * cm),
        KeepTogether([Paragraph('Coordonnées bancaires', style_section), _bloc_bancaire()]),
    ]

    if facture.commentaire:
        elements += [
            Spacer(1, 0.3 * cm),
            Paragraph('Commentaire', style_section),
            Paragraph(facture.commentaire, style_normal),
        ]

    # Signature en bas de page, après les coordonnées bancaires — la facture
    # doit tenir sur une seule page, signature comprise.
    if facture.signature:
        elements += [Spacer(1, 0.35 * cm), KeepTogether(_bloc_signature(facture))]

    pied = _pied_de_page()
    doc.build(elements, onFirstPage=pied, onLaterPages=pied)
    return tampon.getvalue()
