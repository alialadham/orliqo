# Orliqo Phase 1 Design System

These concepts are the visual source of truth for Phase 1:

- `concepts/dashboard-desktop.png` - 1586x992
- `concepts/login-desktop.png` - 1586x992
- `concepts/register-desktop.png` - 1586x992
- `concepts/dashboard-mobile.png` - 853x1844
- `concepts/mobile-more-sheet.png` - 853x1844

The original `orliqo logo.PNG` is the brand source. Concepts are references only and
must never be shipped as flattened app UI.

## Visual Point of View

Orliqo pairs a near-black operational shell with a quiet, soft off-white work area.
The shell communicates control and safety; the work area keeps dense outreach data
clear. Electric blue is reserved for selection and primary action. Green, amber, and
red communicate real state only. The product feels precise and contemporary without
AI-themed illustration, glow, neon, or decorative dashboards.

## Color Lock

Initial code tokens are sampled/approximated from the concept and must be adjusted
against browser screenshots if comparison shows drift.

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `oklch(0.985 0.002 260)` | Soft off-white product/auth surface |
| `--foreground` | `oklch(0.165 0.012 260)` | Primary text |
| `--card` | `oklch(0.995 0.001 260)` | Purposeful framed surfaces |
| `--card-foreground` | foreground | Card text |
| `--shell` | `oklch(0.115 0.01 260)` | Sidebar, top bar, mobile bars |
| `--shell-raised` | `oklch(0.16 0.012 260)` | Selected/hover shell item |
| `--shell-foreground` | `oklch(0.97 0.003 260)` | Shell text/icons |
| `--primary` | `oklch(0.58 0.235 260)` | Main action and selected state |
| `--primary-hover` | `oklch(0.52 0.235 260)` | Primary hover/active |
| `--primary-foreground` | `oklch(0.99 0 0)` | Text on primary |
| `--muted` | `oklch(0.955 0.006 260)` | Secondary fills and rails |
| `--muted-foreground` | `oklch(0.48 0.018 260)` | Supporting text |
| `--border` | `oklch(0.875 0.012 260)` | Thin cool-gray borders |
| `--input` | `oklch(0.82 0.018 260)` | Input borders |
| `--ring` | primary | 2px keyboard focus |
| `--success` | `oklch(0.66 0.17 150)` | Verified/running/positive |
| `--warning` | `oklch(0.76 0.16 75)` | Risk/neutral attention |
| `--destructive` | `oklch(0.62 0.22 27)` | Failure/logout/destructive |
| `--chart-1` | primary | Sent |
| `--chart-2` | `oklch(0.61 0.22 300)` | Delivered |
| `--chart-3` | success | Replied |
| `--chart-4` | `oklch(0.72 0.17 65)` | Positive/secondary series |
| `--chart-5` | `oklch(0.56 0.02 260)` | Rate/reference line |

No color overlay is used on the auth preview or logo. The product background is a
cool soft off-white, not cream or beige. The shell is neutral charcoal, not blue or
purple tinted.

## Typography

- Display/page headings: Manrope, 700, tight tracking.
- Section/card headings: Manrope, 600-700.
- UI/body/control text: Inter, 400-600.
- Arabic fallback: IBM Plex Sans Arabic followed by Alexandria.
- Numeric metrics use tabular figures.

Desktop scale:

| Role | Size / line height | Weight |
| --- | --- | --- |
| Auth statement | 42 / 46 | 700 |
| Page title | 30 / 36 | 700 |
| Auth title | 36 / 44 | 700 |
| Section title | 18 / 24 | 700 |
| Card title | 16 / 22 | 600 |
| Body | 14 / 21 | 400 |
| UI control | 14 / 20 | 500 |
| Label | 13 / 18 | 600 |
| Caption | 12 / 17 | 400-500 |
| Metric | 30 / 34 | 700 |

Mobile headings scale up relative to the viewport's simple hierarchy: 28-32px page
title, 20-22px section title, 16px body/control, and 12-14px labels. Controls never
fall back to browser-default typography.

## Spacing and Geometry

- Base spacing unit: 4px.
- Main steps: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Desktop content gutter: 28-30px.
- Mobile content gutter: 16px.
- Desktop sidebar: approximately 228px.
- Desktop top bar: approximately 68px.
- Mobile header: approximately 88px including safe area.
- Mobile bottom navigation: approximately 82px plus safe area.
- Main radius: 10px; auth/large panels 12px; compact controls 8px.
- Border: 1px cool gray; selected borders use primary.
- Shadow: restrained `0 8px 24px rgb(15 23 42 / 0.06)` only where a floating
  layer needs separation. Most surfaces use borders, not shadows.
- Motion: 160-200ms ease-out for selection, sheets, hover, and progress. Disable or
  reduce transforms under `prefers-reduced-motion`.

## Container Model

- Desktop shell is fixed sidebar + sticky top bar + one scrollable content region.
- Dashboard metrics share one bordered horizontal rail with thin vertical dividers;
  they are not six unrelated cards.
- Main desktop dashboard uses a wide chart region and a narrower right rail for the
  active campaign and recommendation.
- Recent replies uses a compact table/list frame.
- Mobile metrics become a horizontally scrollable rail with a visible next-item edge.
- Mobile dashboard is a single-column stack; chart, campaign, and replies retain
  essential content and 44px actions.
- Mobile More is a full-screen sheet with open list rows and separators. Workspace
  and credit summaries may be individually framed; route rows are not cards.
- Auth pages use an open split layout. The right form does not sit in a large floating
  card. The dark left panel supplies product context.
- Avoid nested cards, repeated bento layouts, giant rounded wrappers, decorative
  tiles, and unnecessary pills.

## Component Families

### Brand Lockup

- Use the original logo image or a non-destructive cropped derivative of that exact
  image. Do not redraw the symbol.
- Render `Orliqo` as code-native wordmark text using Manrope 600-700 when a supplied
  vector/full wordmark is unavailable.
- White mark/wordmark on charcoal only in Phase 1.

### Buttons

- Primary: solid electric blue, white text, 8px radius; desktop 36-40px, auth/mobile
  48-52px. Used for New Campaign, Continue, Create My Workspace, View campaign.
- Secondary: white/off-white, thin border, dark text.
- Ghost: transparent navigation/filter actions.
- Destructive: semantic red, used only for confirmed destructive actions/logout.
- All variants implement hover, focus, active, disabled, pending spinner, success,
  and error feedback as relevant.

### Forms

- 48-52px inputs, visible label above, 8px radius, cool border, blue 2px focus ring.
- Password reveal icon stays inside the input group.
- Validation reserves message space; field and control receive invalid semantics.
- Registration uses a two-column desktop grid and one column below 768px.
- Required terms and optional marketing consent remain separate checkboxes.

### Status and Data

- Status badges are compact semantic labels only: Demo data, Running, Positive,
  High, Neutral, Negative.
- Metrics use a label/icon, strong number, restrained trend, and tiny sparkline.
- Chart series use solid 2px lines with compact markers, readable axes, and an
  accessible text summary.
- Progress uses a thin neutral track and semantic fill.

### Navigation

- Desktop active item uses a subtle raised charcoal surface and white icon/text.
- Inactive shell items remain high-contrast without strong outlines.
- Mobile bottom nav uses five equal items; selected icon/label is blue.
- Inbox count is a true notification badge.
- More sheet route rows use icon, label, and chevron with thin separators.

## Icon Inventory

Use Lucide outline icons at a consistent optical size and approximately 1.75px
stroke. Icons inside shadcn controls inherit component sizing.

- Shell: House, Send, UserRound, Search, Database, Mail, CalendarDays, ChartNoAxes
  Combined, FileText, Plug, CreditCard, Settings, CircleHelp, LogOut.
- Top bar: Search, Coins/Database, Bell, Plus, ChevronDown.
- Metrics: UserRound, Send, MessageCircle, ThumbsUp, CalendarDays, CircleDollarSign.
- Campaign: MapPin, Eye, Pause, UserPlus.
- Recommendation: Sparkles, Clock.
- Auth: Eye/EyeOff, Google/Microsoft brand marks where permitted, Info, CheckCircle,
  BarChart, ShieldCheck, Link, Target.
- Mobile: X, ChevronRight, Ellipsis, Home, Send, UserRound, Mail, Menu/More.

Do not swap filled and outlined metaphors or add icon containers unless shown.

## Allowed Visible Copy

Above-the-fold copy is locked to the concept/master specification. Semantic markup
may change without inventing visible text.

Desktop dashboard:

```text
Good afternoon, Ali
Here is how your outreach is performing.
Demo data
742 credits
+ New Campaign
Qualified leads
Sent
Replies
Positive replies
Meetings
Estimated pipeline
Outreach performance
Active campaign
Amman Studios - Website Audit
AI Recommendations
Recent replies
```

Login:

```text
Find the right businesses. Reach them personally. Convert more clients.
Personalized outreach at scale, backed by evidence and protected by design.
Evidence-backed research
Approval before sending
Official provider connections
Welcome back
Sign in to continue to Orliqo.
Work email
Password
Forgot password?
Continue
or continue with
Continue with Google
Continue with Microsoft
New to Orliqo? Create account
Demo mode available - no messages are sent.
Use demo workspace
```

Registration:

```text
Build a safer outreach engine.
Create your workspace, define who you serve, and keep every message grounded and approved.
1. Create workspace
2. Define your ideal customer
3. Review before sending
Create your workspace
Start in demo mode. Connect providers when you are ready.
Full name
Work email
Password
At least 10 characters
Company name
Country
Team size
I agree to the Terms and Privacy Policy.
Send me occasional product updates.
Create My Workspace
Already have an account? Sign in
Demo mode uses synthetic data and never sends messages.
```

## Responsive Rules

- At 1024px and above, use the desktop sidebar and top bar.
- Below 1024px, remove the sidebar and desktop top bar; show compact header and
  bottom navigation.
- Auth dark context panel is hidden or condensed above the form below 768px. The
  form becomes one column and all fields remain visible without horizontal scroll.
- Data tables preserve core fields as rows or cards only where necessary; they never
  become unreadable desktop tables squeezed into mobile.
- Fixed mobile navigation reserves bottom content padding and safe area.
- The More interaction is a full-screen accessible sheet with a title, close action,
  focus trap, escape behavior, and return focus.

## Fidelity Checklist

Before Phase 1 closes, compare browser screenshots to all five concepts for:

1. Exact visible copy and navigation order.
2. Charcoal/off-white/blue color roles and neutral temperature.
3. Sidebar/top bar and mobile fixed-navigation geometry.
4. Typography personality, scale, and control text.
5. Open container model, thin dividers, radii, and restrained shadow.
6. Metric rail, chart, active campaign, recommendation, and reply anatomy.
7. Auth split proportion and open form layout.
8. Icon metaphor, stroke, size, color, and alignment.
9. Mobile overflow, safe areas, 44px targets, and More sheet behavior.
10. Focus, reduced motion, loading, disabled, success, and error states.
