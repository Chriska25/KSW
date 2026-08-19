# KSW Studio — Design System

Identité visuelle pour une application studio photo professionnelle : sobre, lisible, orientée métier.

## Principes

- **Contenu d'abord** — hiérarchie claire, pas de décor superflu
- **Un accent** — bronze chaud (`primary`) pour actions et repères, jamais de dégradés décoratifs
- **Surfaces solides** — bordures + espacement, ombres réservées aux overlays (dropdown, modal)
- **Lucide React** — seule bibliothèque d'icônes

## Tokens CSS (`globals.css`)

| Token | Usage |
|-------|--------|
| `--background` | Fond application |
| `--surface` | Cartes, panneaux |
| `--surface-elevated` | Dropdowns, modales |
| `--surface-muted` | Zones secondaires, hover |
| `--border` | Séparateurs |
| `--primary` | Actions principales, liens actifs |
| `--muted-foreground` | Texte secondaire |
| `--success`, `--warning`, `--danger`, `--info` | États sémantiques |

## Typographie (Source Sans 3)

| Classe | Usage |
|--------|--------|
| `.text-display` | Titres hero auth |
| `.text-h1` | Titres de page |
| `.text-h2` | Sous-titres section |
| `.text-h3` | Titres de cartes |
| `.text-body` | Corps (défaut body) |
| `.text-small` | Descriptions |
| `.text-caption` | Métadonnées, labels discrets |
| `.text-label` | Labels de formulaire |

## Composants UI (`src/components/ui/`)

- **Button** — `primary`, `secondary`, `outline`, `ghost`, `danger` (`gold` → alias `primary`)
- **Card** — surface + bordure, sans glassmorphism
- **Input** — hauteur 40px, focus ring discret
- **Textarea**, **Select** — formulaires alignés sur Input
- **Table** — `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableEmpty`
- **Badge** — variants sémantiques (`accent`, `primary` alias)
- **Label** — formulaires accessibles

## Classes utilitaires

- `.surface` / `.surface-muted` / `.surface-elevated`
- `.text-accent` — accent sans dégradé
- `.gold-gradient-text` — **rétrocompat** → couleur unie primary
- `.glass-panel` — **rétrocompat** → surface solide (plus de blur)

## Espacement

Échelle : 4 → 8 → 12 → 16 → 24 → 32 → 48 → 64 px

## Radius

- Contrôles (input, button) : `rounded-lg` (8px)
- Cartes : `rounded-lg`
- Modales : `rounded-lg` / `rounded-xl`

## Anti-patterns (à éviter)

- Gradients flashy, glassmorphism décoratif, glow, `shadow-2xl` partout
- `hover:scale-*` sur les boutons
- Emojis comme icônes
- Titres marketing surdimensionnés dans l'admin

## Phases restantes

1. Pages admin métier — polish individuel (settings, galeries, réservations)
2. Site public — prestations, contact, portfolio (hero allégé ✅ homepage)
3. Formulaires — adoption systématique de `Label`
4. Accessibilité — audit focus/contraste page par page
