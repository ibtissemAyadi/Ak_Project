"""Conditions Générales de Vente — texte juridique fixe, partagé par le PDF
devis et le PDF facture (backend/devis/pdf.py, backend/factures/pdf.py) :
une facture annexe les mêmes CGV que le devis dont elle découle, donc un
seul texte de référence plutôt que deux copies qui pourraient diverger."""

from reportlab.lib.units import cm
from reportlab.platypus import HRFlowable, PageBreak, Paragraph, Spacer

from .pdf_theme import COULEUR_BORDURE, style_cgv_body, style_cgv_heading, style_titre_page

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


def elements_cgv(entete):
    """Flowables de la/des page(s) CGV, à ajouter en fin de document (devis
    comme facture). `entete` est le bandeau logo+titre déjà construit par
    l'appelant (_en_tete()) — chaque document y affiche son propre titre
    ("Devis" ou "Facture")."""
    elements = [
        PageBreak(),
        entete,
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
