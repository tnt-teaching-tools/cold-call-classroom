# Cold Call Classroom website

Free browser version of Cold Call Classroom for TNT Teaching Tools. First names and single surname initials only; classes and history are stored in browser local storage. There is no automatic phone/PC sync. No subscription or login.

## Publish

Create a public repository named `cold-call-classroom` under `stp-science`, with a README so it has a main branch. Upload this source. In Settings → Pages choose **GitHub Actions**. The included workflow checks TypeScript, exports the app and publishes it.

Expected website: https://tnt-teaching-tools.github.io/cold-call-classroom/

## Feedback email

The form at the top sends entered feedback to `tntteachingandlearning@gmail.com` through FormSubmit. Submit an activation test once from the live website, then click the confirmation in that inbox. Send a second test and confirm receipt before inviting users. Delivery has not been verified until this is done. No class list or participation data is attached. Name and reply email are optional. The message stays in the form if sending fails.

## Google Analytics

Create a GA4 web data stream for the published URL. Disable enhanced measurement (especially form interactions) and user-provided data collection. Add the site's G- measurement ID to `public/site-config.js`, then commit. Analytics is disabled until a real ID is supplied and the visitor opts in. Tracks page visits and fixed feedback-open/submit events only. No student labels, class names or feedback text is passed to Analytics. Declining or withdrawing consent disables reporting.

## Development

npm ci
npm run typecheck
npm test
npm run build:web

Static output is `dist/`. The `/cold-call-classroom` base path is set in `app.json`; change it if the repository name changes.
