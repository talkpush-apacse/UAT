import type {
  AudienceLevel,
  ModuleName,
  ParsedWorkflow,
  Phase,
  Segment,
  TrainingFormValues,
  TrainingPlan,
} from './training-plan-types'
import { MODULE_PRIORITY } from './training-plan-types'

// ─── Time Budget Constants ────────────────────────────────────────────────────

const CONNECT_MIN = 12
const REFLECT_MIN = 12

const EXPLORE_RATIO: Record<AudienceLevel, number> = {
  beginner: 0.55,
  some_exposure: 0.45,
  refresher: 0.30,
}

const LOOP_MIN: Record<AudienceLevel, number> = {
  beginner: 10,
  some_exposure: 10,
  refresher: 7,
}

// ─── Workflow Parser ──────────────────────────────────────────────────────────

function parseWorkflowJson(raw: string): ParsedWorkflow | null {
  if (!raw.trim()) return null
  try {
    const p = JSON.parse(raw)
    const steps = Array.isArray(p.steps) ? p.steps : Array.isArray(p) ? p : undefined
    const folders: string[] = []

    if (steps) {
      steps.forEach((s: Record<string, unknown>) => {
        const df = s.destination_folder as string | undefined
        const tf = s.trigger_folder as string | undefined
        if (df && typeof df === 'string' && !folders.includes(df)) folders.push(df)
        if (tf && typeof tf === 'string' && !folders.includes(tf)) folders.push(tf)
      })
    }

    return {
      name: typeof p.name === 'string' ? p.name : undefined,
      folders: folders.length > 0 ? folders : (Array.isArray(p.folders) ? p.folders.filter((f: unknown) => typeof f === 'string') : undefined),
      steps: steps,
    }
  } catch {
    return null
  }
}

// ─── Time Budget Calculator ───────────────────────────────────────────────────

function calcTimeBudget(
  duration: number,
  level: AudienceLevel,
  numModules: number
): {
  connectMin: number
  reflectMin: number
  exploreMin: number
  applyMin: number
  maxLoops: number
} {
  const middle = duration - CONNECT_MIN - REFLECT_MIN // 66 or 96
  const exploreTime = Math.floor(middle * EXPLORE_RATIO[level])
  const loopMin = LOOP_MIN[level]
  const maxLoops = Math.floor(exploreTime / loopMin)
  const actualLoops = Math.min(maxLoops, numModules)
  const actualExplore = actualLoops * loopMin
  return {
    connectMin: CONNECT_MIN,
    reflectMin: REFLECT_MIN,
    exploreMin: actualExplore,
    applyMin: middle - actualExplore,
    maxLoops: actualLoops,
  }
}

// ─── Module Script Lookup Tables ──────────────────────────────────────────────

const MODULE_OUTCOMES: Record<ModuleName, string> = {
  'Sourcing': 'source candidates from multiple channels and create their profiles in Talkpush',
  'Campaign Structure': 'set up and organize campaigns for different job roles',
  'Chatbot / Screening': 'understand how automated screening works and review candidate responses',
  'Manual Screening': 'move candidates between folders and manage your pipeline manually',
  'Interview Scheduling': 'schedule interviews directly from the platform without leaving Talkpush',
  'Offers & Dispositions': 'process offers and track final candidate dispositions',
  'Reporting & Analytics': 'pull reports and understand your key recruitment metrics',
  'Integrations': 'understand how Talkpush syncs with your ATS or HRIS system',
}

const CONCEPT_SCRIPTS: Record<ModuleName, string> = {
  'Sourcing': `Here are the three things you need to know about Sourcing in Talkpush:

**1. Multiple entry points, one inbox.** Candidates can come in through job boards, referral links, WhatsApp, SMS, or direct application links — they all land in the same place.

**2. Talkpush creates the profile automatically.** You don't manually enter candidate data. The system captures their info the moment they apply.

**3. You control the entry folder.** Every campaign has a starting folder. That's where all new candidates land first. Your job is to know which folder to check.`,

  'Campaign Structure': `Three things to know about Campaign Structure:

**1. Campaigns are containers for a job opening.** One job role = one campaign (usually). It holds all the settings, folders, and automation rules for that role.

**2. Folders are stages in your pipeline.** Think of folders like columns on a Kanban board — candidates move through them as they progress.

**3. You don't build campaigns from scratch.** Your Talkpush admin sets them up. Your job as a recruiter is to work within the campaign, not configure it.`,

  'Chatbot / Screening': `Three things to know about the Chatbot and Screening:

**1. The chatbot is your first screener.** It sends questions to candidates automatically — you don't need to do anything to trigger it.

**2. Candidates who complete the chatbot move forward automatically.** Those who don't respond stay in the earlier folder until they time out or you intervene.

**3. You review responses, not transcripts.** Talkpush shows you a summary with a score — you're evaluating outcomes, not re-reading every message.`,

  'Manual Screening': `Three things to know about Manual Screening and Folder Management:

**1. Moving a candidate = taking an action.** Drag, click, or use bulk actions to move candidates between folders. This is how you advance or reject them.

**2. Folders are smart — they can trigger automations.** When you move a candidate to certain folders, Talkpush may automatically send a message or schedule something. That's by design.

**3. Bulk actions save time.** You can select multiple candidates and move, tag, or message them all at once. Always use bulk when you have more than 5 candidates to process.`,

  'Interview Scheduling': `Three things to know about Interview Scheduling:

**1. Scheduling happens inside Talkpush.** You don't need to switch to your calendar app. Talkpush can send interview invitations directly to candidates.

**2. The system tracks confirmations.** Once a candidate confirms, their status updates automatically. No manual follow-up needed.

**3. Reminders go out automatically.** Talkpush sends reminders to candidates before their interview. You don't need to chase them.`,

  'Offers & Dispositions': `Three things to know about Offers and Dispositions:

**1. Disposition = final status.** Every candidate needs a disposition before you close their record — Hired, Rejected, Withdrew, No-Show, etc.

**2. Offer stages can vary by client.** Some clients use Talkpush to send formal offer letters; others just track the offer status. Know which approach your client uses.

**3. Accurate dispositions power your analytics.** If you skip dispositions, your reporting will be wrong. It takes 10 seconds — always do it.`,

  'Reporting & Analytics': `Three things to know about Reporting and Analytics:

**1. Reports live inside each campaign.** You don't go to a separate reporting tool — you access reports from within the campaign view.

**2. Key metrics: applications, completion rates, conversion rates.** These tell you how many people entered, how many engaged with the chatbot, and how many moved forward.

**3. You can filter by date, folder, and path.** If you want to see only last week's data, or only candidates on the Happy Path — you can filter for it.`,

  'Integrations': `Three things to know about Talkpush Integrations:

**1. Talkpush syncs with your ATS or HRIS automatically.** When a candidate is hired in Talkpush, that data flows to your main system of record without you doing anything.

**2. You don't configure the integration.** That's the admin's job. Your job is to understand what triggers the sync — usually moving a candidate to a specific folder.

**3. If the sync fails, you'll see a flag.** Talkpush shows integration errors so you know to escalate. You don't need to troubleshoot it yourself.`,
}

const DEMO_SCRIPTS: Record<ModuleName, (folder: string, wfName: string) => string> = {
  'Sourcing': (folder, wfName) => `Watch me add a candidate manually — this is what you'd do if someone applied outside the system.

I'm going to go to ${wfName ? `the **${wfName}** campaign` : 'our campaign'} → click **New Candidate** → fill in the basic details → and save.

Notice how they land directly in **${folder || 'the entry folder'}**. The system timestamped the entry and assigned them a candidate ID automatically.

Now watch this — I'm going to switch to the sourcing link view. See these unique URLs? Each one tracks where the candidate came from. This is how Talkpush knows whether they applied via LinkedIn, your careers page, or a referral.`,

  'Campaign Structure': (folder, _wfName) => `Let me give you a tour of how a campaign is organized.

Here's the campaign list. See these tabs? Each one is a campaign. I'll click into this one.

Now look at the left side — these are your **folders**. Think of each folder as a stage. The candidate starts in **${folder || 'the first folder'}** and moves right as they progress.

Notice this folder has a number badge. That's how many candidates are waiting for your attention right now. A healthy pipeline means you're regularly clearing these numbers.`,

  'Chatbot / Screening': (folder, _wfName) => `I'm going to show you what the chatbot flow looks like from the recruiter's side.

Here's a candidate who just completed screening. They're now in **${folder || 'the screening folder'}**. Click on their name.

See this panel on the right? This is the candidate's conversation with the chatbot. They answered all the questions. Now look at this score — Talkpush calculated it based on their responses.

I'm going to show you a second candidate who didn't complete the screening. See how they're still in the previous folder? The system is waiting for them. I can either nudge them manually or let the automation handle it.`,

  'Manual Screening': (folder, _wfName) => `Let me show you the fastest way to process a batch of candidates.

I'm in **${folder || 'the screening folder'}** right now. I'll click the checkbox at the top to select all candidates on this page.

Now I'll click **Move to** and select the next folder. Done — all of them moved in one click.

Now watch this — I'll do one candidate individually so you can see the detail. Click on their name → review their profile → use the folder dropdown on the right to move them. This is useful when you need to check the profile before deciding.`,

  'Interview Scheduling': (folder, _wfName) => `I'm going to schedule an interview for a candidate right now — watch how few clicks this takes.

Here's our candidate in **${folder || 'the interview folder'}**. I'll click their name → go to the **Schedule** tab → select an interview slot → and confirm.

The candidate just received an automatic invitation. See this confirmation status? It'll update to "Confirmed" once they respond.

One more thing — if you need to reschedule, you come back here, click **Reschedule**, pick a new slot. The candidate gets a new invitation automatically. You don't need to send anything manually.`,

  'Offers & Dispositions': (folder, _wfName) => `Here's how to properly close out a candidate — this is the step most people skip, and it causes problems.

I'm looking at a candidate who just completed their interview. They're in **${folder || 'the offers folder'}**. I'll click on them → find the **Disposition** dropdown → select the right status.

For a hire: select **Hired** → the system prompts me for a start date → I fill it in → save.

For a rejection: select **Rejected** → optionally add a reason → save. The candidate may receive an automatic rejection message depending on your campaign setup.

That's it. Two clicks. Always do this before you archive or close a campaign.`,

  'Reporting & Analytics': (folder, _wfName) => `Let me pull a quick report so you can see what's available.

I'm inside the campaign. I'll click **Reports** in the top navigation.

See these default views? **Pipeline Overview** shows you volume at each stage. **Conversion Rates** shows you where candidates are dropping off. **Time to Hire** shows you how long your process takes.

I'll filter this by the last 30 days — see how the numbers update? Now I'll filter by just the **${folder || 'Happy Path'}** to see only candidates who completed the full flow.

You can export any of these to Excel from this button here.`,

  'Integrations': (_folder, wfName) => `Let me show you what an integration handoff looks like in practice.

When a candidate gets hired in Talkpush, the system sends their data to your ATS automatically. You don't do anything — it happens when you move them to the hire folder.

Watch — I'll move this test candidate to the hire folder in **${wfName ? `the ${wfName} campaign` : 'this campaign'}**. See this integration icon? It'll turn green once the sync completes. If it stays orange, that means the sync failed and you need to flag it.

Your admin can see all sync logs in the integration dashboard. You just need to know what a successful vs. failed sync looks like.`,
}

const TRYIT_SCRIPTS: Record<ModuleName, (folder: string) => string> = {
  'Sourcing': (folder) => `Your turn. I want you to add a test candidate manually.

Go to the campaign → click **New Candidate** → use any name (you can use your own name for testing) → fill in a phone number or email → save.

Confirm with me: Where did they land? They should be in **${folder || 'the entry folder'}**.

If you don't see them there, raise your hand — we'll troubleshoot together. Everyone else: try clicking on your new candidate's profile and look at the information panel on the right.`,

  'Campaign Structure': (folder) => `Take two minutes to explore the campaign structure.

Find **${folder || 'the first folder'}** and tell me: how many candidates are currently sitting there?

Now click on any folder and see if you can find the folder settings. You won't be changing anything — just looking. Notice what options are available.

When you're done, tell me: what's one thing that surprised you about how the campaign is organized?`,

  'Chatbot / Screening': (folder) => `I want you to find a candidate who has completed the chatbot and one who hasn't.

Go to **${folder || 'the screening folder'}** — those are the completers. Look at their chat summary.

Now go back to the previous folder — those are the ones still waiting.

Question for the group: based on what you see, how would you decide which incomplete candidates are worth a manual nudge vs. which ones you'd let time out?`,

  'Manual Screening': (folder) => `Practice time. I want everyone to move at least one candidate.

Go to **${folder || 'your folder'}** → pick a candidate → use the folder dropdown on their profile to move them to the next stage.

If you have more than 3 candidates, try the bulk action: checkbox → select all → Move to.

Tell me when you've done it. I'll watch the live count to see the folders updating in real time.`,

  'Interview Scheduling': (folder) => `Go to **${folder || 'the interview folder'}** and pick any candidate.

Schedule a test interview with any time slot. Don't worry — we're in a test environment and no real invitations will be sent.

Once you've scheduled it: where does the candidate appear now? Has their folder changed? Has their status updated?

Take a look at the interview confirmation panel and tell me what information you see there.`,

  'Offers & Dispositions': (folder) => `Find a candidate in **${folder || 'the current folder'}** and give them a disposition.

If they'd realistically be hired: select **Hired** and enter today as the start date.
If not: select **Rejected**.

The goal is muscle memory — by the end of training, dispositioning a candidate should take you less than 20 seconds.

Who finished first? Walk us through what you clicked.`,

  'Reporting & Analytics': (folder) => `Open the Reports tab in this campaign.

I want you to find the answer to this question: **How many candidates reached ${folder || 'the final stage'} in the last 30 days?**

Use whatever filters you need. When you find the number, tell me — and also tell me which report view you used to find it.

Bonus challenge: export the pipeline overview to Excel.`,

  'Integrations': (_folder) => `Open the integration log for this campaign if you can find it.

You're looking for any recent sync events — successful or failed. Can you find one?

If you can't find the log directly, look for any integration indicators on individual candidate profiles. Some integrations show a sync status badge on the candidate card.

Tell me what you find — or what you *couldn't* find. Both are useful learning.`,
}

// ─── Helper: segment ID generator ────────────────────────────────────────────

let _segId = 0
function segId(): string {
  return `seg-${++_segId}`
}

// ─── Phase 1: Connect ─────────────────────────────────────────────────────────

function buildConnectPhase(form: TrainingFormValues, modules: ModuleName[]): Phase {
  const outcomeList = modules.map(m => `- ${MODULE_OUTCOMES[m]}`).join('\n')

  const segments: Segment[] = [
    {
      id: segId(),
      title: 'Welcome & Icebreaker',
      timeMinutes: 5,
      type: 'icebreaker',
      trainerScript: `Welcome, everyone. Really glad you're here today.

Before we dive in, I want to start with a quick question — and I want everyone to answer, so we can hear from the whole group.

**Here it is: What's the most tedious part of your current recruitment process?**

It could be something that takes too long, something you have to do manually that feels like it should be automatic, or just something that drains you.

Take 30 seconds to think about it — then I'll go around and hear from everyone.

*(After responses):*

I wrote those down for a reason. By the end of today, I'm going to show you exactly how Talkpush addresses most of what you just told me. So hold onto those — we're going to come back to them.`,
      trainerNotes: `Let 3–4 people answer, or go around the room if the group is small. Write their pain points somewhere visible — a whiteboard, a sticky note, or in the chat.

You'll reference these during demos to make the content feel personal. "Remember when [Name] mentioned [problem]? Watch what happens when I do this..."

If the group is quiet, call on someone by name with a warm tone: "I'll start with you — what's the one thing you wish disappeared from your workday?"`,
    },
    {
      id: segId(),
      title: 'Session Roadmap',
      timeMinutes: 3,
      type: 'lecture',
      trainerScript: `Let me tell you exactly what we're going to cover today — and more importantly, what you'll be able to *do* by the time we're done.

By the end of this session, you'll be able to:

${outcomeList}

We're not going to just talk about these things. You're going to practice each one. So get comfortable, ask questions as we go, and don't worry about making mistakes — that's what this environment is for.

Here's how we'll structure our time: We'll start with a quick orientation, then go through each area together — I'll show you, then you try it. In the second half, I'll give you realistic scenarios to work through on your own. We'll close with a debrief.

Any questions before we start?`,
      trainerNotes: `Keep this brief. Don't read the list robotically — say it conversationally, making eye contact.

The key message is: "This is a doing session, not a watching session." Set that expectation clearly so participants know they'll be hands-on.

If anyone looks nervous, normalize it: "If you've never used Talkpush before, that's completely fine — that's why we're here."`,
    },
    {
      id: segId(),
      title: 'Pre-Training Confidence Check',
      timeMinutes: 4,
      type: 'knowledge_check',
      trainerScript: `Before we get into the content, I want to take a quick snapshot of where everyone's starting from.

I'm going to read the same list of outcomes we just covered. For each one, I want you to rate your confidence on a scale of **1 to 5**:

- **1** = "I have no idea how to do this"
- **3** = "I've seen it done but wouldn't know where to start"
- **5** = "I could do this right now without help"

Ready? Think about your honest number — don't second-guess yourself.

*[Read the outcome list slowly, pausing after each one.]*

Don't share your number yet — just hold onto it. We're going to ask you the same question at the end of the session, and I want you to see how much your number changes.`,
      trainerNotes: `You can run this as a private reflection (they write their numbers down) or as a live poll if you're using a tool like Mentimeter or Slido.

If the group average seems high (everyone says 4–5), consider fast-forwarding through Explore and spending more time on Apply scenarios. If it's low (1–2 across the board), slow down Phase 2 and make sure each Try-It exercise is fully completed before moving on.

Note the numbers privately — you'll reference "your number at the start" during the post-training check.`,
    },
  ]

  return {
    name: 'Connect',
    goal: 'Build psychological safety, establish relevance, baseline assessment',
    timeMinutes: CONNECT_MIN,
    color: 'blue',
    segments,
  }
}

// ─── Phase 2: Explore ─────────────────────────────────────────────────────────

function buildExplorePhase(
  form: TrainingFormValues,
  totalMinutes: number,
  maxLoops: number,
  workflow: ParsedWorkflow | null,
  activeModules: ModuleName[]
): Phase {
  const isRefresher = form.audienceLevel === 'refresher'
  const conceptMin = isRefresher ? 1 : 2
  const demoMin = isRefresher ? 2 : 3
  const tryItMin = isRefresher ? 4 : 5

  const primaryFolder = workflow?.folders?.[0] || ''
  const wfName = workflow?.name || ''

  const segments: Segment[] = []

  activeModules.forEach((mod, idx) => {
    const isPersonalized = !!(workflow && (primaryFolder || wfName))
    const nextMod = activeModules[idx + 1]
    const transition = nextMod
      ? `\n\n---\n\n*Now that you know how to ${MODULE_OUTCOMES[mod].split(' and')[0]}, let's see how **${nextMod}** connects to it.*`
      : ''

    segments.push({
      id: segId(),
      title: `Loop ${idx + 1}: ${mod} — Concept`,
      timeMinutes: conceptMin,
      type: 'lecture',
      trainerScript: CONCEPT_SCRIPTS[mod],
      trainerNotes: `Keep this tight — 3 key points only. If participants ask detailed questions, acknowledge them and say "Great question — we'll see that in the demo." Resist the urge to expand here; the demo is coming in 2 minutes.`,
    })

    segments.push({
      id: segId(),
      title: `Loop ${idx + 1}: ${mod} — Live Demo`,
      timeMinutes: demoMin,
      type: 'demo',
      trainerScript: DEMO_SCRIPTS[mod](primaryFolder, wfName) + transition,
      trainerNotes: `Narrate every click out loud. Don't assume they can see what you're doing — say "I'm clicking the folder dropdown on the right side of the candidate card" rather than just clicking it. Go slower than you think you need to.`,
      isPersonalized,
    })

    segments.push({
      id: segId(),
      title: `Loop ${idx + 1}: ${mod} — Guided Try-It`,
      timeMinutes: tryItMin,
      type: 'guided_exercise',
      trainerScript: TRYIT_SCRIPTS[mod](primaryFolder),
      trainerNotes: `Circulate and watch. The goal is to see who's stuck before they raise their hand. Common failure mode: participants navigate to the wrong campaign. If more than 2 people are lost, pause the group and reorient together rather than helping each person individually.`,
      isPersonalized,
    })
  })

  return {
    name: 'Explore',
    goal: 'Build mental model through Concept → Demo → Try-It micro-loops',
    timeMinutes: totalMinutes,
    color: 'green',
    segments,
  }
}

// ─── Phase 3: Apply ───────────────────────────────────────────────────────────

function buildApplyPhase(
  form: TrainingFormValues,
  totalMinutes: number,
  workflow: ParsedWorkflow | null,
  activeModules: ModuleName[]
): Phase {
  const isRefresher = form.audienceLevel === 'refresher'
  const clientName = form.clientName || 'your client'

  // Extract workflow data for personalization
  const happySteps = workflow?.steps?.filter(
    s => !s.path?.toLowerCase().includes('non') && !s.candidate_experience?.toLowerCase().includes('non')
  ) || []
  const nonHappySteps = workflow?.steps?.filter(
    s => s.path?.toLowerCase().includes('non') || s.candidate_experience?.toLowerCase().includes('non')
  ) || []
  const decisionSteps = workflow?.steps?.filter(
    s => s.step_type?.toLowerCase().includes('decision')
  ) || []

  const firstFolder = workflow?.folders?.[0] || 'the entry folder'
  const secondFolder = workflow?.folders?.[1] || 'the next folder'

  // Tier 1 — Straightforward (skip for refresher)
  const tier1Script = workflow && happySteps.length >= 2
    ? `Here's your first scenario. This one is straightforward — it mirrors something you'll do every single day.

**The Situation:**
A candidate just applied to the ${clientName} campaign. They came in through the online application link. They've completed the initial chatbot and their profile is sitting in **${firstFolder}**.

**Your Task:**
1. Find the candidate in Talkpush
2. Open their profile and review their chatbot responses
3. Move them to **${secondFolder}**
4. Leave a brief note on their profile about what you observed

You have 7 minutes. Go ahead.`
    : `Here's your first scenario. This one is straightforward — it mirrors something you'll do every single day.

**The Situation:**
A candidate named Alex Rivera just applied to the ${clientName} campaign. They completed the pre-screening chatbot and are sitting in the first folder of your pipeline.

**Your Task:**
1. Find Alex in Talkpush
2. Open their profile and check their chatbot responses and score
3. Based on what you see, move them to the appropriate next folder
4. Add a short note summarizing your decision

You have 7 minutes. Work independently — I'll call time when we're ready to debrief.`

  // Tier 2 — Multi-step
  const decisionStep = decisionSteps[0]
  const tier2Script = workflow && decisionStep
    ? `Good work on Tier 1. Now let's raise the stakes — this scenario requires you to make a judgment call.

**The Situation:**
You have 5 candidates who've all completed the chatbot screening in the ${clientName} campaign. Their scores vary from 2 out of 5 to 5 out of 5. You also have a decision to make: ${decisionStep.label || decisionStep.text || 'candidates who meet the criteria should move forward; others need a follow-up'}.

**Your Task:**
1. Review all 5 candidate profiles
2. Apply the ${decisionStep.label || 'screening criteria'} — move qualified candidates forward, others to the appropriate non-qualifying folder
3. Schedule interview slots for the qualified candidates
4. Send a bulk status message to those who didn't qualify

You have 10 minutes. Use everything you practiced in the Explore phase.`
    : `Good work. Now this scenario requires you to combine multiple steps — and make a judgment call.

**The Situation:**
You're looking at a batch of 5 candidates who completed pre-screening for the ${clientName} campaign. Their scores range from 2 to 5. Your brief says anyone scoring 3 or above should move to interview scheduling; below 3 goes to a hold folder.

**Your Task:**
1. Review all 5 profiles and their scores
2. Move the qualified candidates (score ≥ 3) to the interview folder
3. Schedule interview slots for each qualified candidate
4. Move the others to the hold folder and add a disposition note

You have 10 minutes. This is where you start building speed — try to beat your time from the last exercise.`

  // Tier 3 — Troubleshooting
  const nonHappyStep = nonHappySteps[0]
  const tier3Script = workflow && nonHappyStep
    ? `Last scenario — this is the one that trips people up in real life.

**The Situation:**
A candidate contacts your team saying they applied last week but nobody has reached out to them. They're frustrated. You check Talkpush and can't immediately find them.

This might happen because: ${nonHappyStep.action || nonHappyStep.label || 'the candidate did not complete the screening process and was moved to a non-responsive folder'}.

**Your Task:**
1. Search for the candidate by name and email — find every place they might appear in the system
2. If they're in a non-happy path folder, identify which one and why they ended up there
3. Decide: Do you re-engage them, move them forward, or close their profile?
4. Take whatever action you decide and document your reasoning in a note

Walk us through your thinking out loud as you go. There's no single right answer — I want to see your process.`
    : `Last scenario — this is the one that trips people up in real life.

**The Situation:**
A candidate named Jordan Park contacts your HR team. They applied two weeks ago for the ${clientName} role and haven't heard anything. They're frustrated. You check Talkpush and can't immediately find them in the active pipeline.

**Your Task:**
1. Search for Jordan by name and email
2. Find where they are in the system — they might be in an unexpected folder
3. Figure out why they stopped progressing (didn't complete chatbot? Screened out automatically?)
4. Decide what to do: re-engage, advance, or close. Document your decision.

Talk through your reasoning as you work — I want to hear your thought process, not just see the clicks.`

  const segments: Segment[] = []

  if (!isRefresher) {
    segments.push({
      id: segId(),
      title: 'Scenario Tier 1 — Straightforward',
      timeMinutes: 10,
      type: 'scenario',
      trainerScript: tier1Script,
      trainerNotes: `This should feel comfortable after the Try-It exercises. If participants finish early, ask them to help a neighbor or try the scenario again using bulk actions instead of individual ones. Watch for anyone who navigates to the wrong campaign — this is the most common mistake.`,
      isPersonalized: !!(workflow && happySteps.length >= 2),
    })

    segments.push({
      id: segId(),
      title: 'Tier 1 Debrief',
      timeMinutes: 3,
      type: 'debrief',
      trainerScript: `Let's take 3 minutes to debrief.

What tripped you up? What clicked easily?

Did anyone find a faster way to do it than the way I showed you?

*(Pause for responses)*

Good. That's the goal — by the time you're doing this daily, these actions should take you under 2 minutes each. Speed comes with repetition.`,
      trainerNotes: `Don't skip this even if the group is quiet. Ask specifically: "Who found a shortcut I didn't show you?" This surfaces power user instincts and gives quieter participants a chance to contribute.`,
    })
  }

  segments.push({
    id: segId(),
    title: `Scenario Tier ${isRefresher ? '1' : '2'} — Multi-Step`,
    timeMinutes: 10,
    type: 'scenario',
    trainerScript: tier2Script,
    trainerNotes: `This is where participants start to see how the modules connect. Watch for people who try to handle candidates one at a time when bulk actions would be faster — gently redirect them. If someone finishes early, ask them to double-check their work by pulling a quick report on the candidates they just processed.`,
    isPersonalized: !!(workflow && decisionStep),
  })

  segments.push({
    id: segId(),
    title: `Tier ${isRefresher ? '1' : '2'} Debrief`,
    timeMinutes: 3,
    type: 'debrief',
    trainerScript: `Good work. Let's surface what you learned.

What was harder than expected? What was easier?

If you had to do this same task for 50 candidates instead of 5 — what would you do differently?

*(Pause for responses)*

Notice that the system handles a lot of the complexity for you. Your job is to make the judgment calls — Talkpush handles the mechanics.`,
    trainerNotes: `Use this debrief to reinforce the "recruiter as decision-maker, system as executor" mental model. The goal is that participants leave feeling in control, not overwhelmed by the technology.`,
  })

  const tier3Modules = activeModules.filter(m =>
    ['Sourcing', 'Chatbot / Screening', 'Manual Screening'].includes(m)
  )

  if (tier3Modules.length > 0 || isRefresher) {
    segments.push({
      id: segId(),
      title: `Scenario Tier ${isRefresher ? '2' : '3'} — Troubleshooting`,
      timeMinutes: 10,
      type: 'scenario',
      trainerScript: tier3Script,
      trainerNotes: `This is the hardest scenario intentionally. Some participants will get stuck — that's fine. The goal is to see their problem-solving approach, not just the right answer. If someone is completely lost after 5 minutes, give them a hint: "Start with the search bar in the top right corner."`,
      isPersonalized: !!(workflow && nonHappyStep),
    })

    segments.push({
      id: segId(),
      title: `Tier ${isRefresher ? '2' : '3'} Debrief`,
      timeMinutes: 3,
      type: 'debrief',
      trainerScript: `That was the toughest one. How did it go?

What was your first instinct when you couldn't find the candidate? Did it work?

*(Pause)*

This scenario represents something that *will* happen in your real work. The key is: don't panic, start with search, and look at every folder including non-happy paths. The candidate is always somewhere in the system.`,
      trainerNotes: `Normalize the difficulty. Say something like: "Even experienced recruiters find this one tricky at first. The important thing is knowing where to look." Then reinforce the search-first habit.`,
    })
  }

  return {
    name: 'Apply',
    goal: 'Test real-world application with increasing difficulty scenarios',
    timeMinutes: totalMinutes,
    color: 'orange',
    segments,
  }
}

// ─── Phase 4: Reflect ─────────────────────────────────────────────────────────

function buildReflectPhase(form: TrainingFormValues, activeModules: ModuleName[]): Phase {
  const resourceList = buildResourceList(activeModules)

  const segments: Segment[] = [
    {
      id: segId(),
      title: 'Post-Training Confidence Check',
      timeMinutes: 3,
      type: 'knowledge_check',
      trainerScript: `We're going to end the same way we started.

Same question, same scale of 1 to 5. Think about where you are right now — honestly.

How confident are you that you could handle your real Talkpush queue tomorrow morning?

*(Pause for reflection)*

Now — how many of you are higher than when we started?

*(Pause for hands/responses)*

That jump? That's real. That's three hours of deliberate practice, and that progress belongs to you.

The number doesn't have to be 5 yet. It doesn't even have to be 4. Progress is progress.`,
      trainerNotes: `If you have the numbers from the opening check, reference them explicitly: "You all started around a 2. Most of you are now at a 3 or 4. That's real movement in a few hours."

If possible, share the before/after on screen — the visual impact is powerful for groups that didn't believe they could learn the system.`,
    },
    {
      id: segId(),
      title: 'Top 3 Takeaways',
      timeMinutes: 5,
      type: 'debrief',
      trainerScript: `I want to do something a little different to close out.

I'm not going to summarize what we covered. You're going to do it — because your brain retains it better that way.

Take 60 seconds and write down — physically write or type — the **3 things you most want to remember from today**. Not what I told you to remember. What *you* found most useful, most surprising, or most important for your actual work.

Go.

*(After 60 seconds)*

Would anyone like to share one of their three? Let's hear a few.

*(Collect 3–5 responses)*

What I love about this exercise is that everyone's list is slightly different — because you each came in with different pain points, and you each connected the training to your own work. That's exactly right.`,
      trainerNotes: `Resist the urge to add to their takeaways or correct them. This is an active recall exercise — let them own it. If someone says something incorrect, you can gently clarify, but err on the side of celebrating what they got right.

The forcing function of "write it down" is important. Don't skip it.`,
    },
    {
      id: segId(),
      title: 'Resource Handoff',
      timeMinutes: 3,
      type: 'handoff',
      trainerScript: `One more thing before we close.

You won't remember everything from today. That's completely normal — and it's not a problem, because you don't have to.

Here's your safety net:

${resourceList}

**Bookmark these. Right now, while we're still together.**

These resources are there for the moment you're back at your desk, you go to do something, and you can't remember exactly how. Don't panic, don't bother your manager — start with these.

And if you truly get stuck? That's what support is for. Don't suffer in silence.`,
      trainerNotes: `Pause here and actually give people 30 seconds to open the links and bookmark them. Don't just read the list and move on — make them take the action while you're watching.

Add any client-specific resources here: internal wiki pages, their specific campaign URL, the name of their Talkpush admin contact.`,
      materials: [
        'Talkpush Help Center — help.talkpush.com',
        'Recruiter Cheatsheet (provided separately)',
        'Talkpush Support — support@talkpush.com',
        'Your Talkpush Admin contact (name/email)',
      ],
    },
    {
      id: segId(),
      title: 'Parking Lot Q&A',
      timeMinutes: 1,
      type: 'debrief',
      trainerScript: `Okay — open floor. Any questions that came up during our exercises that we didn't get to answer?

*(Address questions)*

If we're out of time and you still have questions, write them down and send them to me. I'll follow up by end of day.

Thank you all for your energy today. You showed up, you practiced, you pushed through the hard scenarios. That's the work. You're more ready than you think.`,
      trainerNotes: `Keep this to 5 minutes max. If the group has many questions, offer to stay on for an optional 10-minute bonus Q&A for those who want it.

Common questions to prepare for:
- "What happens if I move a candidate to the wrong folder?" (You can move them back; there's no permanent damage)
- "Can I undo an action?" (Depends on the action — most folder moves are reversible)
- "Who do I contact if something looks wrong?" (Their Talkpush admin, then support)`,
    },
  ]

  return {
    name: 'Reflect',
    goal: 'Measure growth, reinforce key concepts, provide safety net resources',
    timeMinutes: REFLECT_MIN,
    color: 'purple',
    segments,
  }
}

function buildResourceList(modules: ModuleName[]): string {
  const base = [
    '📖 **[Talkpush Help Center](https://help.talkpush.com)** — step-by-step guides for every feature',
    '💬 **Support chat** — available inside Talkpush (click the ? icon)',
    '📋 **Your recruiter cheatsheet** — quick reference for your specific workflow',
  ]

  if (modules.includes('Reporting & Analytics')) {
    base.push('📊 **Reporting guide** — how to read and export your campaign reports')
  }
  if (modules.includes('Integrations')) {
    base.push('🔗 **Integration docs** — what triggers the ATS/HRIS sync and how to check sync status')
  }

  return base.join('\n')
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function generateTrainingPlan(form: TrainingFormValues): TrainingPlan {
  // Reset segment ID counter for deterministic output
  _segId = 0

  const workflow = parseWorkflowJson(form.workflowJson)

  const sortedModules = [...form.modules].sort(
    (a, b) => MODULE_PRIORITY.indexOf(a) - MODULE_PRIORITY.indexOf(b)
  )

  const timeBudget = calcTimeBudget(
    form.duration,
    form.audienceLevel,
    sortedModules.length
  )

  const activeModules = sortedModules.slice(0, timeBudget.maxLoops)
  const trimmedModules = sortedModules.slice(timeBudget.maxLoops)

  return {
    metadata: {
      client: form.clientName,
      trainer: form.trainerName,
      date: form.trainingDate,
      duration: form.duration,
      audienceLevel: form.audienceLevel,
      modules: activeModules,
    },
    phases: [
      buildConnectPhase(form, activeModules),
      buildExplorePhase(form, timeBudget.exploreMin, timeBudget.maxLoops, workflow, activeModules),
      buildApplyPhase(form, timeBudget.applyMin, workflow, activeModules),
      buildReflectPhase(form, activeModules),
    ],
    totalMinutes: form.duration,
    trimmedModules: trimmedModules.length > 0 ? trimmedModules : undefined,
  }
}
