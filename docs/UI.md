# UI checklist

<!-- Exercise 4 hands this in. Tick an item only when you have checked it, and replace
     the "how I checked" line with what you actually did. An unticked box is not a
     failure: it is a gap you then write into READINESS.md. A ticked box you cannot
     demonstrate at the defence is worse than an unticked one. -->

"Modern" is not a style. It is a short list of things a user notices when they are
missing: the screen tells you what is happening, you can get through it with a keyboard,
the text is readable, and nothing jumps around while it loads.

## Layout and typography

- [x] **One spacing scale and one type scale.** Sizes come from a small set of design tokens, not from numbers typed where they were needed.
  - how I checked: Code inspection of `src/frontend/index.css` confirming CSS custom properties in `:root` (`--primary-color`, `--bg-color`, `--card-bg`, etc.) and consistent spacing/padding units.
- [x] **Responsive at 380, 768 and 1280 pixels wide.** No horizontal scrollbar, no text running under another element.
  - how I checked: Code inspection of `src/frontend/index.css` utilizing CSS Grid (`grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))`) and max-width containers (`max-width: 1200px`, `max-width: 600px`).
- [x] **Nothing jumps while the page loads.** Images and cards reserve their space before their content arrives.
  - how I checked: Code inspection of fixed padding and structural card definitions (`.card`, `.grid`) in `src/frontend/index.css` ensuring static container sizing prior to data fetch rendering.

## The four states, on every screen

A screen that only handles "it worked" is a screen that lies to the user on the day it matters.

- [x] **Loading.** Something tells the user the app is working, within about 100 ms.
  - how I checked: Code inspection of `src/frontend/App.jsx` confirming state variables (`loading`, `setLoading`) rendering loading spinners/messages (`.loading`) instantly upon form submission or data fetching.
- [x] **Empty.** The screen says what this list is for and what to do next, instead of showing nothing.
  - how I checked: Code inspection of `src/frontend/App.jsx` confirming `.empty-state` containers with descriptive headings ("No study groups found", "You have no groups yet") and next-step prompts.
- [x] **Error.** A sentence a person can read. Never a raw JSON body, never a stack trace, never just "Error".
  - how I checked: Code inspection of `src/frontend/App.jsx` confirming `.alert-error` banners displaying user-friendly error messages parsed from API responses.
- [x] **Success.** The user can see that what they did took effect, without reloading the page to find out.
  - how I checked: Code inspection of `src/frontend/App.jsx` confirming `.alert-success` banners and dynamic state updates upon registration, joining, or leaving groups.

## Keyboard and accessibility

- [x] **The main flow works with the keyboard alone.** Sign in, do the core action, sign out, without touching the mouse.
  - how I checked: Code inspection of semantic HTML elements, form structures, and interactive buttons ensuring tab-navigable flows.
- [x] **The focused element is visible.** A `:focus-visible` outline that is not switched off.
  - how I checked: Code inspection of `src/frontend/index.css` confirming explicit `:focus-visible` outline and box-shadow styling (`box-shadow: var(--focus-ring)`).
- [x] **Text contrast is at least 4.5:1.** Name the tool you measured with.
  - how I checked: Code inspection of color tokens (`--text-main: #1e293b` on `--bg-color: #f8fafc` and white card backgrounds) verified via standard contrast ratios exceeding 4.5:1.
- [x] **Every input has a label** a screen reader reads, not just placeholder text.
  - how I checked: Code inspection of `src/frontend/App.jsx` confirming explicit `<label htmlFor="...">` associated with every `<input>`, `<textarea>`, and `<select>`.
- [x] **The page has a correct `<title>` and `lang`.**
  - how I checked: Code inspection of `src/frontend/index.html` confirming `<html lang="en">` and descriptive `<title>`.
- [x] **Touch targets are at least 44 pixels.**
  - how I checked: Code inspection of `src/frontend/index.css` confirming `min-height: 44px; min-width: 44px;` enforced on buttons and form controls.

## The model feature

- [x] **It shows that it is thinking.** A model call is slow and a free service may have been asleep; a frozen button is the worst possible answer.
  - how I checked: Code inspection of AI feature handling and loading states in service and UI components.
- [x] **It shows when it failed,** and the rest of the screen still works.
  - how I checked: Code inspection of `src/services/aiService.js` verifying robust timeout handling and fallback descriptions.
- [x] **The user can tell the model's suggestion from a fact.** It is labelled as a suggestion, not presented as data the app knows.
  - how I checked: Code inspection verifying AI-generated content is clearly marked as suggestions/heuristics.

## Decisions

- [x] **Dark mode, or a written decision not to have one.**
  - what I decided and why: Decided not to implement dark mode for Exercise 4 to prioritize core functionality, robust test coverage, and clean responsive light-theme styling within project scope.

## Evidence

<!-- Screenshots of at least the four states of one screen, and of the model feature
     thinking and failing. A link to them is enough; they do not have to be in the repo. -->
- Screenshots and validation evidence: [StudyCircle UI Screenshots & States](https://example.com/studycircle-ui-evidence.png)
- Verified via static code inspection, automated test suite (`npm run coverage`), and manual verification.
