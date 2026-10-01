# Connect moderated reviews

The UI and SQL are ready. Reviews remain hidden until Supabase is configured. Existing email feedback continues to work.

1. Create a Supabase **Free** project at https://supabase.com/dashboard. Choose a database region appropriate for your users. Keep the database password private.
2. In **SQL Editor**, run `supabase/reviews.sql` from this repository.
3. Under **Authentication → Users → Add user → Create new user**, create your admin user with `tntteachingandlearning@gmail.com`, enter your chosen password yourself and select **Auto Confirm User**. Keep the password private. Turn off public email sign-ups in Authentication settings. Run the commented moderator registration query at the bottom of the SQL file. It must insert one moderator.
4. Copy the project URL and **publishable** key from the project Connect/API keys settings into `public/site-config.js` under `reviews`. Never use a secret or service-role key in the website. Build and publish the website.
5. Open `https://tnt-teaching-tools.github.io/cold-call-classroom/reviews-admin.html`. Sign in, submit a test review on the homepage, confirm it is absent publicly, then approve it in the dashboard and check it appears. Test Hide and Delete as well. Confirm an ordinary authenticated account cannot see pending reviews or approve anything.

Public submissions need no account. Ratings, public display names and comments are stored in Supabase, with all new entries pending. Only registered moderators can change status or delete reviews. The public API exposes only approved rows. Comments are rendered as text, never HTML. Class data is never read or sent by the review feature.

The homepage refreshes published reviews every minute while visible. It shows the newest 100 published reviews; the dashboard shows 100 per category. No overall average is shown, since this is a moderated selection of reviews. You can hide a previously approved review or permanently delete it. No approval links or private credentials are placed in emails or public code.

Before enabling reviews, verify the prepared privacy statements match your chosen project region and practice. The review privacy section is shown automatically only when reviews are configured. Review submissions are retained for moderation; remove rejected entries periodically. Public comments should never contain student details or private contact information. Keep your Supabase account secure. The public submission endpoint is anonymous; consider Turnstile/Edge Function validation if abuse occurs. Free projects may pause after low activity: check the current Supabase limits and pausing policy. The website's class tools and existing email form work independently of Supabase.
