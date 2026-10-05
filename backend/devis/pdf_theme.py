"""Thème visuel partagé par les PDF devis et facture (backend/devis/pdf.py,
backend/factures/pdf.py) : palette de couleurs, police et formatage commun.
Point de vérité unique — un ajustement ici s'applique identiquement aux deux
documents, qui doivent rester visuellement cohérents.

Charte "bureau d'études / cabinet d'ingénierie" : bleu marine + bleu
secondaire + bleu clair sur fond blanc cassé, typographie Montserrat —
élégante, technique, minimaliste.

Police : Montserrat (Regular/Medium/SemiBold/Bold), embarquée en TTF
statique dans assets/fonts/. La police variable officielle n'est plus
distribuée avec des instances statiques toutes prêtes — ces fichiers ont
été générés une fois avec `fonttools varLib.instancer` (wght=400/500/600/700)
à partir de la police variable officielle (google/fonts, licence OFL)."""

from decimal import Decimal
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ASSETS_DIR = Path(__file__).resolve().parent / 'assets'
LOGO_PATH = ASSETS_DIR / 'ak_logo.png'

# ---------------------------------------------------------------------------
# Police — 4 graisses déclarées individuellement (reportlab ne sait mapper
# qu'une seule graisse "bold" par famille) ; chaque style ci-dessous choisit
# explicitement la sienne plutôt que de s'appuyer uniquement sur <b>.
# ---------------------------------------------------------------------------
FONT_REGULAR = 'Montserrat'
FONT_MEDIUM = 'Montserrat-Medium'
FONT_SEMIBOLD = 'Montserrat-SemiBold'
FONT_BOLD = 'Montserrat-Bold'

for _nom, _fichier in [
    (FONT_REGULAR, 'Montserrat-Regular.ttf'),
    (FONT_MEDIUM, 'Montserrat-Medium.ttf'),
    (FONT_SEMIBOLD, 'Montserrat-SemiBold.ttf'),
    (FONT_BOLD, 'Montserrat-Bold.ttf'),
]:
    pdfmetrics.registerFont(TTFont(_nom, str(ASSETS_DIR / 'fonts' / _fichier)))

# Nécessaire pour que le balisage <b>...</b> dans les Paragraph bascule sur
# la bonne graisse (SemiBold, pas la Bold 700 réservée au grand titre) — pas
# d'italique dédiée : Regular en repli, jamais utilisée dans ces documents.
pdfmetrics.registerFontFamily(
    FONT_REGULAR, normal=FONT_REGULAR, bold=FONT_SEMIBOLD, italic=FONT_REGULAR, boldItalic=FONT_SEMIBOLD,
)

# ---------------------------------------------------------------------------
# Palette
# ---------------------------------------------------------------------------
COULEUR_PRINCIPALE = colors.HexColor('#0B2948')    # bleu marine — titres, header/footer, total TTC
COULEUR_SECONDAIRE = colors.HexColor('#3976A4')    # bleu secondaire — références, accents, séparateurs
COULEUR_CLAIRE = colors.HexColor('#DCEAF4')        # bleu clair — badges, fonds de bloc, cellules secondaires
COULEUR_FOND_PAGE = colors.HexColor('#FAFAF7')     # blanc cassé — fond de page
COULEUR_TEXTE_ATTENUE = colors.HexColor('#6E7882')  # gris texte — mentions, footer, labels
COULEUR_BORDURE = colors.HexColor('#E5EAEE')        # gris/bleu très clair — bordures, séparateurs

# Alias conservés pour les deux documents consommateurs (devis/pdf.py,
# factures/pdf.py) : mêmes noms qu'avant, nouvelles valeurs de la charte.
COULEUR_FOND_TOTAL = COULEUR_CLAIRE
COULEUR_FOND_ALT = COULEUR_CLAIRE

# ---------------------------------------------------------------------------
# Coordonnées société — identiques sur les deux documents.
# ---------------------------------------------------------------------------
COMPANY_NAME_CONTACT = 'A and K CONSEIL ET INGENIERIE'
COMPANY_NAME_FOOTER = 'A AND K CONSEIL ET INGENIERIE'
COMPANY_ADDRESS = '13 rue Ali Belhouane, La Soukra, 2036 Ariana – Tunisie'
COMPANY_PHONE = '(+216)22901127'
COMPANY_EMAIL = 'contact@ak-ingenierie.fr'
COMPANY_VAT_ID = '1931449T/A/M/000'

MOIS_FR = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

# ---------------------------------------------------------------------------
# Styles de paragraphe communs
# ---------------------------------------------------------------------------
style_titre = ParagraphStyle(
    # Grand titre de couverture ("Devis"/"Facture") : Bold 700, 30pt, dans la
    # fourchette 28-34pt de la charte.
    'Titre', fontName=FONT_BOLD, fontSize=30, leading=34,
    textColor=COULEUR_PRINCIPALE, spaceAfter=0,
)
style_titre_page = ParagraphStyle(
    'TitrePage', fontName=FONT_BOLD, fontSize=17, leading=21,
    textColor=COULEUR_PRINCIPALE, spaceBefore=4, spaceAfter=10,
)
style_section = ParagraphStyle(
    'Section', fontName=FONT_SEMIBOLD, fontSize=10.5, leading=13,
    textColor=COULEUR_PRINCIPALE, spaceBefore=4, spaceAfter=6,
)
style_cgv_heading = ParagraphStyle(
    'CgvHeading', fontName=FONT_SEMIBOLD, fontSize=9.5, leading=12,
    textColor=COULEUR_PRINCIPALE, spaceBefore=10, spaceAfter=3,
)
style_normal = ParagraphStyle('Normal', fontName=FONT_REGULAR, fontSize=9.5, leading=13.5)
style_cgv_body = ParagraphStyle(
    'CgvBody', parent=style_normal, fontSize=8.5, leading=12.5,
    textColor=COULEUR_TEXTE_ATTENUE, spaceAfter=4, alignment=4,  # 4 = justify
)
style_muted = ParagraphStyle('Muted', parent=style_normal, textColor=COULEUR_TEXTE_ATTENUE)
style_bold = ParagraphStyle('Bold', parent=style_normal, fontName=FONT_SEMIBOLD)
style_droite = ParagraphStyle('Droite', parent=style_normal, alignment=TA_RIGHT)
style_droite_muted = ParagraphStyle('DroiteMuted', parent=style_droite, textColor=COULEUR_TEXTE_ATTENUE)
style_champ_droite = ParagraphStyle(
    # Labels "Date :", "N° de devis :", "Référence client :" — ce sont des
    # références au sens de la charte : bleu secondaire, graisse Medium
    # plutôt que la couleur/poids des titres.
    'ChampDroite', parent=style_droite, textColor=COULEUR_SECONDAIRE,
    fontName=FONT_MEDIUM, spaceAfter=3,
)
style_a_client = ParagraphStyle('AClient', parent=style_bold, textColor=COULEUR_PRINCIPALE, fontSize=10.5)
style_entete_tableau = ParagraphStyle(
    'EnteteTableau', fontName=FONT_MEDIUM, fontSize=9, textColor=colors.white,
)


def entete_tableau(cellules):
    """Cellules d'en-tête de tableau : libellé en blanc, sur fond
    COULEUR_PRINCIPALE (appliqué séparément via TableStyle)."""
    from reportlab.platypus import Paragraph

    return [Paragraph(c, style_entete_tableau) for c in cellules]


# ---------------------------------------------------------------------------
# Formatage — convention française (virgule décimale, espace en séparateur
# de milliers), commune aux deux documents.
# ---------------------------------------------------------------------------
def formater_montant(valeur) -> str:
    q = Decimal(valeur).quantize(Decimal('0.01'))
    negatif = q < 0
    entier, decimales = f'{abs(q):.2f}'.split('.')
    groupes = []
    while len(entier) > 3:
        groupes.insert(0, entier[-3:])
        entier = entier[:-3]
    groupes.insert(0, entier)
    return ('-' if negatif else '') + ' '.join(groupes) + ',' + decimales + ' €'


def formater_nombre(valeur, decimales=2) -> str:
    q = Decimal(valeur).quantize(Decimal('1.' + '0' * decimales))
    return f'{q:.{decimales}f}'.replace('.', ',')


def formater_date(d) -> str:
    return d.strftime('%d/%m/%Y') if d else '—'


def formater_date_longue(d) -> str:
    return f'{d.day} {MOIS_FR[d.month - 1]} {d.year}' if d else '—'
