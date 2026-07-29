import json
import hashlib
from sqlalchemy.orm import Session
from models import Setting, User, Service, Testimonial, Gallery

def hash_password(pwd: str) -> str:
    return hashlib.sha256(pwd.encode('utf-8')).hexdigest()

def seed_database(db: Session):
    # Seed Settings if empty
    if db.query(Setting).count() == 0:
        default_settings = {
            "studioNameFirstPart": "KSW",
            "studioNameSecondPart": "STUDIO",
            "studioSubtitle": "HAUTE PHOTOGRAPHIE & PRODUCTION",
            "studioName": "KSW STUDIO",
            "siteTitle": "KSW STUDIO - Photographie d'Art & Studio Photo d'Exception",
            "studioDescription": "Studio photographique d'art spécialisé dans le mariage d'exception, le portrait de caractère et le reportage corporate haut de gamme en France et à l'international.",
            "contactEmail": "contact@kswstudio.fr",
            "phone": "+33 1 42 68 00 00",
            "address": "12 Rue du Faubourg Saint-Honoré, 75008 Paris",
            "currency": "EUR (€)",
            "timezone": "Europe/Paris",
            "depositRate": "30",
            "watermarkText": "Épreuve sécurisée",
            "watermarkPosition": "bottom_center",
            "watermarkOpacity": "40",
            "webpQuality": "85",
        }
        for k, v in default_settings.items():
            db.add(Setting(key=k, value=json.dumps(v) if isinstance(v, (dict, list)) else str(v), group="general"))
        db.commit()

    # Seed Users if empty
    if db.query(User).count() == 0:
        users = [
            User(
                id="u-1",
                first_name="Photographe",
                last_name="Master",
                email="admin@kswstudio.fr",
                password=hash_password("Password123!"),
                role="admin",
                status="active"
            ),
            User(
                id="u-2",
                first_name="Alexandre",
                last_name="Marc",
                email="a.marc@kswstudio.fr",
                password=hash_password("Password123!"),
                role="photographer",
                status="active"
            ),
            User(
                id="u-3",
                first_name="Camille",
                last_name="Laurent",
                email="c.laurent@kswstudio.fr",
                password=hash_password("Password123!"),
                role="assistant",
                status="active"
            ),
            User(
                id="u-4",
                first_name="Sophie",
                last_name="Dupont",
                email="sophie.d@email.com",
                password=hash_password("Password123!"),
                role="client",
                status="active"
            ),
        ]
        for u in users:
            db.add(u)
        db.commit()

    # Seed Services if empty
    if db.query(Service).count() == 0:
        services = [
            Service(
                id="1",
                title="Mariage \"Collection Sublime\"",
                category="Mariage",
                price=1890.0,
                deposit_percentage=30,
                duration_minutes=720,
                photos_count=450,
                cover_image="https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop",
                is_active=True
            ),
            Service(
                id="2",
                title="Séance Portrait d'Art & Signature",
                category="Portrait",
                price=350.0,
                deposit_percentage=30,
                duration_minutes=90,
                photos_count=15,
                cover_image="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop",
                is_active=True
            ),
            Service(
                id="3",
                title="Pack Corporate Executive & Branding",
                category="Corporate",
                price=650.0,
                deposit_percentage=30,
                duration_minutes=180,
                photos_count=30,
                cover_image="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop",
                is_active=True
            ),
        ]
        for s in services:
            db.add(s)
        db.commit()

    # Seed Testimonials if empty
    if db.query(Testimonial).count() == 0:
        testimonials = [
            Testimonial(
                id="1",
                client_name="Sophie & Alexandre",
                client_role="Mariés en Juillet 2026",
                rating=5,
                content="Une expérience magique du début à la fin ! Les photos de notre mariage au Château de Chantilly sont à couper le souffle.",
                avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop",
                is_published=True
            ),
            Testimonial(
                id="2",
                client_name="Julien Mercier",
                client_role="Portrait Executive",
                rating=5,
                content="Séance portrait extrêmement professionnelle en studio. Le photographe a su me mettre immédiatement à l'aise.",
                avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
                is_published=True
            )
        ]
        for t in testimonials:
            db.add(t)
        db.commit()

    # Seed Galleries if empty
    if db.query(Gallery).count() == 0:
        g1 = Gallery(
            id='1',
            title='Mariage Sophie & Alexandre - Château de Chantilly',
            client_name='Sophie Dupont',
            client_email='sophie.d@email.com',
            category='mariage',
            is_private=True,
            access_key='SOPHIE-ALEX-2026',
            password='Love2026!',
            cover_url='https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop',
            albums=[
                {'id': 'alb-1', 'name': 'Préparatifs & Habillage', 'photosCount': 2, 'isPrivate': True},
                {'id': 'alb-2', 'name': 'Cérémonie & Alliances', 'photosCount': 2, 'isPrivate': True},
                {'id': 'alb-3', 'name': 'Cocktail & Valse', 'photosCount': 2, 'isPrivate': True}
            ],
            photos=[
                {
                    'id': '1',
                    'title': 'Échange des Alliances - Château de Chantilly',
                    'cat': 'mariage',
                    'url': 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
                    'albumId': 'alb-2',
                    'albumName': 'Cérémonie & Alliances',
                    'isFavorite': True,
                    'isCover': True,
                    'isPrivate': True
                },
                {
                    'id': '4',
                    'title': 'Réception & Valse des Mariés',
                    'cat': 'mariage',
                    'url': 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1200&auto=format&fit=crop',
                    'albumId': 'alb-3',
                    'albumName': 'Cocktail & Valse',
                    'isFavorite': True,
                    'isCover': False,
                    'isPrivate': True
                }
            ]
        )
        pub_gallery = Gallery(
            id='2',
            title='Portfolio Public Studio 2026',
            client_name='Portfolio Public',
            category='portrait',
            is_private=False,
            access_key='PUBLIC-2026',
            cover_url='https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
            albums=[
                {'id': 'alb-pub1', 'name': 'Portraits Studio', 'photosCount': 2, 'isPrivate': False},
                {'id': 'alb-pub2', 'name': 'Corporate Executive', 'photosCount': 2, 'isPrivate': False}
            ],
            photos=[
                {
                    'id': '2',
                    'title': 'Portrait Noir & Blanc Profond',
                    'cat': 'portrait',
                    'url': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200&auto=format&fit=crop',
                    'albumId': 'alb-pub1',
                    'albumName': 'Portraits Studio',
                    'isFavorite': True,
                    'isCover': True,
                    'isPrivate': False
                },
                {
                    'id': '3',
                    'title': 'Executive Leadership Campaign',
                    'cat': 'corporate',
                    'url': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1200&auto=format&fit=crop',
                    'albumId': 'alb-pub2',
                    'albumName': 'Corporate Executive',
                    'isFavorite': False,
                    'isCover': False,
                    'isPrivate': False
                }
            ]
        )
        db.add(g1)
        db.add(pub_gallery)
        db.commit()


DEMO_GALLERY_KEY = 'SOPHIE-ALEX-2026'


def ensure_demo_gallery(db: Session) -> None:
    """Garantit que la galerie démo client existe avec les bons paramètres privés."""
    gallery = db.query(Gallery).filter(Gallery.access_key.ilike(DEMO_GALLERY_KEY)).first()
    if not gallery:
        g1 = Gallery(
            id='1',
            title='Mariage Sophie & Alexandre - Château de Chantilly',
            client_name='Sophie Dupont',
            client_email='sophie.d@email.com',
            category='mariage',
            is_private=True,
            access_key=DEMO_GALLERY_KEY,
            password='Love2026!',
            cover_url='https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop',
            albums=[
                {'id': 'alb-1', 'name': 'Préparatifs & Habillage', 'photosCount': 2, 'isPrivate': True},
                {'id': 'alb-2', 'name': 'Cérémonie & Alliances', 'photosCount': 2, 'isPrivate': True},
                {'id': 'alb-3', 'name': 'Cocktail & Valse', 'photosCount': 2, 'isPrivate': True},
            ],
            photos=[
                {
                    'id': '1',
                    'title': 'Échange des Alliances - Château de Chantilly',
                    'cat': 'mariage',
                    'url': 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
                    'albumId': 'alb-2',
                    'albumName': 'Cérémonie & Alliances',
                    'isFavorite': True,
                    'isCover': True,
                    'isPrivate': True,
                },
                {
                    'id': '4',
                    'title': 'Réception & Valse des Mariés',
                    'cat': 'mariage',
                    'url': 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1200&auto=format&fit=crop',
                    'albumId': 'alb-3',
                    'albumName': 'Cocktail & Valse',
                    'isFavorite': True,
                    'isCover': False,
                    'isPrivate': True,
                },
            ],
        )
        db.add(g1)
        db.commit()
        return

    changed = False
    if not gallery.is_private:
        gallery.is_private = True
        changed = True
    if gallery.password != 'Love2026!':
        gallery.password = 'Love2026!'
        changed = True
    if (gallery.client_email or '').lower() != 'sophie.d@email.com':
        gallery.client_email = 'sophie.d@email.com'
        changed = True
    if changed:
        db.commit()


DEFAULT_BLOG_POSTS = [
    {
        'id': '1',
        'slug': 'preparer-sa-seance-photo-mariage',
        'title': '10 Conseils Indispensables pour des Photos de Mariage Inoubliables',
        'category': 'Conseils Mariage',
        'author': 'Photographe Master',
        'isPublished': True,
        'publishedAt': '12 Juillet 2026',
        'readTime': '5 min',
        'featuredImage': 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
        'excerpt': 'De la gestion du timing des préparatifs jusqu\'au choix de la lumière de fin de journée, découvrez mes secrets de photographe pro.',
        'content': 'Le jour de votre mariage est l\'un des événements les plus précieux de votre vie.\n\n### 1. Prévoyez un Timing Aéré\nLes préparatifs sont des moments chargés en émotions.\n\n### 2. Privilégiez la Lumière Naturelle\nLa Golden Hour offre une lumière douce et poétique.\n\n### 3. Faites Confiance à votre Photographe\nLes plus belles images sont souvent les plus spontanées.',
        'tags': ['Mariage', 'Conseils', 'Organisation'],
    },
    {
        'id': '2',
        'slug': 'comment-s-habiller-portrait-studio',
        'title': 'Comment S\'habiller pour une Séance Portrait en Studio ?',
        'category': 'Portrait',
        'author': 'Photographe Master',
        'isPublished': True,
        'publishedAt': '02 Juin 2026',
        'readTime': '4 min',
        'featuredImage': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200&auto=format&fit=crop',
        'excerpt': 'Harmonie des couleurs, textures, accessoires : nos recommandations pour valoriser votre teint.',
        'content': 'Bien préparer sa garde-robe est essentiel pour réussir son portrait en studio.\n\nPrivilégiez des couleurs unies, des textures nobles et des coupes qui vous mettent en confiance.',
        'tags': ['Portrait', 'Studio', 'Conseils'],
    },
]


def ensure_blog_posts(db: Session) -> None:
    setting = db.query(Setting).filter(Setting.key == 'blog_posts').first()
    if setting and setting.value:
        try:
            existing = json.loads(setting.value)
            if isinstance(existing, list) and len(existing) > 0:
                return
        except Exception:
            pass
    db.add(Setting(key='blog_posts', value=json.dumps(DEFAULT_BLOG_POSTS), group='content'))
    db.commit()


DEFAULT_FAQ_ITEMS = [
    {
        'id': 'faq-1',
        'question': "Combien de temps à l'avance dois-je réserver mon mariage ?",
        'answer': "Pour les mariages entre mai et septembre, il est recommandé de réserver entre 8 et 12 mois à l'avance. N'hésitez pas toutefois à nous contacter pour vérifier la disponibilité sur une date spécifique.",
        'order': 0,
        'isPublished': True,
    },
    {
        'id': 'faq-2',
        'question': 'Comment s\'effectue la livraison de mes photographies ?',
        'answer': 'Toutes vos photographies retouchées en Haute Définition vous sont livrées dans une galerie privée sécurisée sous 2 à 3 semaines, avec possibilité de téléchargement ZIP illimité.',
        'order': 1,
        'isPublished': True,
    },
    {
        'id': 'faq-3',
        'question': 'Fournissez-vous les fichiers bruts (RAW) ?',
        'answer': "Le travail d'étalonnage et de retouche fait partie intégrante de la signature artistique du studio. Nous livrons uniquement des images sélectionnées et sublimées en format JPEG HD.",
        'order': 2,
        'isPublished': True,
    },
    {
        'id': 'faq-4',
        'question': "Quels sont les modes de paiement acceptés pour l'acompte ?",
        'answer': "Nous acceptons le règlement de l'acompte directement en ligne par carte bancaire via Stripe sécurisé, PayPal ou par virement bancaire.",
        'order': 3,
        'isPublished': True,
    },
]


def ensure_faq_items(db: Session) -> None:
    setting = db.query(Setting).filter(Setting.key == 'faq_items').first()
    if setting and setting.value:
        try:
            existing = json.loads(setting.value)
            if isinstance(existing, list) and len(existing) > 0:
                return
        except Exception:
            pass
    db.add(Setting(key='faq_items', value=json.dumps(DEFAULT_FAQ_ITEMS), group='content'))
    db.commit()
