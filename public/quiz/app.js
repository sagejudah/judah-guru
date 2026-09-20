let players=[],scores={},attempts={},turns=[],turnIndex=0,quizQuestions=[],currentQ=null,selected=null,timerId=null,timeLeft=45,timeLimit=45,turnTimerId=null,stage=null;
let roomCode=null,isSpectator=false,pollTimerId=null;
const $=id=>document.getElementById(id);
const LOCAL_KEY="quizStateV1";
const TOPICS_KEY="quizCustomTopics";

let customTopics={};
try{customTopics=JSON.parse(localStorage.getItem(TOPICS_KEY)||"{}")}catch(e){customTopics={}}

// Merges the built-in question bank (questions.js) with anything imported
// on this device. Both solo and battle mode pick a pool from here by name.
function allTopics(){return Object.assign({},BUILT_IN_TOPICS,customTopics)}

function populateTopicSelect(sel){
  const topics=allTopics();
  const current=sel.value;
  sel.innerHTML=Object.keys(topics).map(name=>`<option value="${escapeHtml(name)}">${escapeHtml(name)} (${topics[name].length})</option>`).join("");
  if(topics[current])sel.value=current;
}

const __params=new URLSearchParams(location.search);
const __spectateCode=(__params.get("spectate")||"").toUpperCase();
// Admin view is deliberately never a visible button — only reachable by
// someone who's been given a judah.guru/quiz?admin=CODE link directly, so
// students can't grant themselves admin from the landing screen.
const __adminCode=(__params.get("admin")||"").toUpperCase();

function shuffle(a){return [...a].sort(()=>Math.random()-.5)}

function renderNameInputs(){
  const n=Math.max(1,Math.min(20,Number($("participantCount").value)||1));
  const box=$("names"); box.innerHTML="";
  for(let i=0;i<n;i++){
    const row=document.createElement("div"); row.className="nameRow";
    row.innerHTML=`<input id="name${i}" placeholder="Participant ${i+1}" maxlength="30">`;
    box.appendChild(row);
  }
}

function buildTurns(){
  // Shuffle participants, then deal turn slots round-robin.
  // Therefore everyone receives either floor(Q/P) or ceil(Q/P) turns.
  const order=shuffle(players);
  turns=[];
  for(let i=0;i<quizQuestions.length;i++) turns.push(order[i%order.length]);
}

async function startGame(){
  const count=Math.max(1,Math.min(20,Number($("participantCount").value)||1));
  players=[];
  for(let i=0;i<count;i++){
    const value=$(`name${i}`).value.trim()||`Player ${i+1}`;
    players.push(value);
  }
  if(new Set(players).size!==players.length){
    alert("Please give each participant a different name.");
    return;
  }
  timeLimit=Math.max(5,Math.min(600,Number($("timeLimit").value)||45));
  scores={}; attempts={}; players.forEach(p=>{scores[p]=0;attempts[p]=0});
  quizQuestions=shuffle(allTopics()[$("soloTopicSelect").value]||questions);
  buildTurns();
  turnIndex=0;
  $("setup").classList.add("hidden");
  $("results").classList.add("hidden");
  $("turnChange").classList.add("hidden");
  $("game").classList.remove("hidden");
  $("hamburgerBtn").classList.remove("hidden");
  renderScores();
  roomCode=await createRoom({phase:"setup",players,scores,attempts});
  showRoomBadge();
  showTurnChange();
}

function showQuestion(){
  clearInterval(timerId);
  selected=null;
  stage="question";
  currentQ=quizQuestions[turnIndex];
  const player=turns[turnIndex];
  $("playerName").textContent=player;
  $("turnNumber").textContent=turnIndex+1;
  $("questionNumber").textContent=`QUESTION ${turnIndex+1} OF ${quizQuestions.length}`;
  $("questionText").textContent=currentQ.question;
  $("feedback").textContent="";
  $("feedback").className="feedback";

  const wrap=$("questionImageWrap"),img=$("questionImage");
  if(currentQ.image){img.src=currentQ.image;wrap.classList.remove("hidden")}
  else{img.removeAttribute("src");wrap.classList.add("hidden")}

  const box=$("options"); box.innerHTML="";
  currentQ.options.forEach((text,i)=>{
    const b=document.createElement("button");
    b.className="option";
    b.textContent=`${String.fromCharCode(65+i)}. ${text}`;
    b.onclick=()=>answer(i);
    box.appendChild(b);
  });
  $("nextBtn").disabled=true;
  $("nextBtn").textContent=turnIndex===quizQuestions.length-1?"Finish Game":"Next Person";
  startTimer();
  pushState("question");
  saveLocal();
}

function startTimer(startAt){
  timeLeft=startAt!==undefined?startAt:timeLimit;
  updateTimer();
  timerId=setInterval(()=>{
    timeLeft--;
    updateTimer();
    if(timeLeft<=5&&timeLeft>0)playBeep("tick");
    pushState("question");
    saveLocal();
    if(timeLeft<=0){
      clearInterval(timerId);
      timeout();
    }
  },1000);
}

function updateTimer(){$("timer").textContent=timeLeft}

function answer(index){
  if(selected!==null||stage!=="question"||timeLeft<=0)return;
  clearInterval(timerId);
  selected=index;
  const buttons=[...document.querySelectorAll(".option")];
  buttons.forEach(b=>b.disabled=true);
  const correct=index===currentQ.answer;
  buttons[index].classList.add(correct?"correct":"wrong");
  if(!correct)buttons[currentQ.answer].classList.add("correct");
  const player=turns[turnIndex];
  attempts[player]=(attempts[player]||0)+1;
  if(correct){scores[player]++;$("feedback").textContent="✓ Correct! +1 point";$("feedback").className="feedback good"}
  else{$("feedback").textContent=`✗ Not quite. Correct answer: ${currentQ.options[currentQ.answer]}`;$("feedback").className="feedback bad"}
  $("nextBtn").disabled=false;
  renderScores();
  pushState("question");
  saveLocal();
}

function timeout(){
  if(selected!==null)return;
  selected=-1;
  const player=turns[turnIndex];
  attempts[player]=(attempts[player]||0)+1;
  const buttons=[...document.querySelectorAll(".option")];
  buttons.forEach(b=>b.disabled=true);
  buttons[currentQ.answer].classList.add("correct");
  $("feedback").textContent=`⏰ Time! Correct answer: ${currentQ.options[currentQ.answer]}`;
  $("feedback").className="feedback timeout";
  $("nextBtn").disabled=false;
  renderScores();
  pushState("question");
  saveLocal();
}

// --- Turn-change sequence ---
// Pressing "Next Person" / "Finish Game" first checks an answer was given,
// then (for anything but the final question) plays a two-phase countdown:
// an anonymous 3-2-1 build-up, followed by the next player's name and a
// second 3-2-1 before the question appears. Mirrors the 30 Seconds "get
// ready" screen, beeps included.
function nextTurn(){
  if(selected===null)return;
  if(turnIndex<quizQuestions.length-1){
    turnIndex++;
    showTurnChange();
  } else finishGame();
}

function showTurnChange(){
  clearInterval(turnTimerId);
  stage="turnChange1";
  $("game").classList.add("hidden");
  $("turnChange").classList.remove("hidden");
  $("turnRevealName").classList.add("hidden");
  $("turnPhaseLabel").textContent="NEXT PERSON IN";
  $("turnCountdown").classList.remove("hidden");
  saveLocal();
  runCountdown(3, revealPlayer, "turnChange");
}

function revealPlayer(){
  stage="turnChange2";
  const player=turns[turnIndex];
  $("turnPhaseLabel").textContent="UP NEXT";
  $("turnRevealName").textContent=player;
  $("turnRevealName").classList.remove("hidden");
  $("turnCountdown").classList.remove("hidden");
  playBeep("reveal");
  saveLocal();
  runCountdown(3, proceedToQuestion, "turnChange");
}

function proceedToQuestion(){
  $("turnChange").classList.add("hidden");
  $("game").classList.remove("hidden");
  showQuestion();
}

// Counts a number down to zero, beeping each tick, then calls onDone.
// (Never displays "0" itself — matches the 30 Seconds ready-screen feel.)
// pushPhase, if given, syncs the visible state to spectators on every tick.
function runCountdown(from, onDone, pushPhase){
  let n=from;
  $("turnCountdown").textContent=n;
  playBeep("tick");
  if(pushPhase)pushState(pushPhase);
  turnTimerId=setInterval(()=>{
    n--;
    if(n>0){
      $("turnCountdown").textContent=n;
      playBeep("tick");
      if(pushPhase)pushState(pushPhase);
    } else {
      clearInterval(turnTimerId);
      onDone();
    }
  },1000);
}

let audioCtx=null;
function playBeep(type){
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    const now=audioCtx.currentTime;
    const freq=type==="reveal"?880:520;
    const peak=type==="reveal"?.16:.09;
    const dur=type==="reveal"?.3:.15;
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type="sine";o.frequency.value=freq;
    g.gain.setValueAtTime(.0001,now);
    g.gain.exponentialRampToValueAtTime(peak,now+.01);
    g.gain.exponentialRampToValueAtTime(.0001,now+dur);
    o.connect(g);g.connect(audioCtx.destination);o.start(now);o.stop(now+dur+.05);
  }catch(e){}
}

function scoreLine(p){return `${scores[p]||0}/${attempts[p]||0}`}

function renderScores(){
  $("scoresBar").innerHTML=players.map(p=>`<div class="scoreChip ${p===turns[turnIndex]?"active":""}">${escapeHtml(p)}: <strong>${scoreLine(p)}</strong></div>`).join("");
}

function finishGame(){
  clearInterval(timerId);
  clearInterval(turnTimerId);
  stage="results";
  $("game").classList.add("hidden");
  $("turnChange").classList.add("hidden");
  $("results").classList.remove("hidden");
  const sorted=[...players].sort((a,b)=>(scores[b]||0)-(scores[a]||0));
  $("finalScores").innerHTML=sorted.map((p,i)=>`<div class="finalRow"><span>${i===0?"🏆 ":""}${escapeHtml(p)}</span><strong>${scoreLine(p)}</strong></div>`).join("");
  pushState("results");
  saveLocal();
}

function escapeHtml(v){const d=document.createElement("div");d.textContent=v;return d.innerHTML}

// --- Import Questions ---
// Lets someone paste an AI-formatted (or hand-formatted) JSON array of
// questions and save it as a new topic, available alongside the built-in
// bank in both solo and battle setup. Stored per-device in localStorage.

const AI_FORMAT_PROMPT=`Format the following study questions as a JSON array for a quiz app. Each item must look exactly like this:
{"question":"...","options":["A","B","C","D"],"answer":0}

Rules:
- "options" must have exactly 4 items.
- "answer" is the index (0-3) of the correct option.
- Output ONLY a valid JSON array — no extra text, no markdown code fences, no explanation.

Here are my questions/notes to convert:
[PASTE YOUR QUESTIONS OR NOTES HERE]`;

function showImportScreen(){
  $("landing").classList.add("hidden");
  $("importQuestions").classList.remove("hidden");
}
function backFromImport(){
  $("importQuestions").classList.add("hidden");
  $("landing").classList.remove("hidden");
}
function copyAiPrompt(){
  navigator.clipboard.writeText(AI_FORMAT_PROMPT).then(()=>{
    const btn=$("copyAiPromptBtn"),prev=btn.textContent;
    btn.textContent="Copied!";
    setTimeout(()=>{btn.textContent=prev},1500);
  }).catch(()=>{});
}
function saveImportedTopic(){
  const name=($("importTopicName").value||"").trim();
  if(!name){alert("Give this topic a name.");return}
  let parsed;
  try{parsed=JSON.parse($("importTextarea").value)}catch(e){alert("That's not valid JSON — check the format.");return}
  if(!Array.isArray(parsed)||!parsed.length){alert("Expected a JSON array of questions.");return}
  for(const q of parsed){
    if(!q||typeof q.question!=="string"||!Array.isArray(q.options)||q.options.length!==4||typeof q.answer!=="number"||q.answer<0||q.answer>3){
      alert("Each question needs: question (text), options (exactly 4), answer (0-3).");
      return;
    }
  }
  customTopics[name]=parsed;
  try{localStorage.setItem(TOPICS_KEY,JSON.stringify(customTopics))}catch(e){}
  populateTopicSelect($("soloTopicSelect"));
  populateTopicSelect($("battleTopicSelect"));
  $("importTopicName").value=""; $("importTextarea").value="";
  alert(`Saved "${name}" with ${parsed.length} questions.`);
  backFromImport();
}


// --- Mid-game controls (hamburger menu) ---

function addParticipant(){
  const input=$("menuNewName");
  const name=(input.value||"").trim();
  if(!name)return;
  if(players.includes(name)){alert("That name is already in the game.");return}
  players.push(name);
  scores[name]=0; attempts[name]=0;
  // Reshuffle only the not-yet-played remainder of the turn order so the
  // new player gets a fair share of whatever questions are left; turns
  // already played (or in progress) are untouched.
  if(turns.length){
    const donePrefix=turns.slice(0,turnIndex+1);
    const remaining=turns.length-donePrefix.length;
    const order=shuffle(players);
    const tail=[];
    for(let i=0;i<remaining;i++)tail.push(order[i%order.length]);
    turns=[...donePrefix,...tail];
  }
  input.value="";
  renderScores();
  const phase=stage==="turnChange1"||stage==="turnChange2"?"turnChange":stage;
  if(phase)pushState(phase);
  saveLocal();
  closeMenu();
}

function applyTimeLimit(){
  const v=Math.max(5,Math.min(600,Number($("menuTimeLimit").value)||timeLimit));
  timeLimit=v;
  saveLocal();
  closeMenu();
}

function endGame(){
  if(!confirm("End the game now? This stops it for spectators too."))return;
  clearInterval(timerId); clearInterval(turnTimerId);
  stage=null; roomCode=null;
  try{localStorage.removeItem(LOCAL_KEY)}catch(e){}
  $("game").classList.add("hidden");
  $("turnChange").classList.add("hidden");
  $("results").classList.add("hidden");
  $("hamburgerBtn").classList.add("hidden");
  $("roomBadge").classList.add("hidden");
  closeMenu();
  $("setup").classList.remove("hidden");
}

function openMenu(){$("menuTimeLimit").value=timeLimit;$("hamburgerPanel").classList.remove("hidden")}
function closeMenu(){$("hamburgerPanel").classList.add("hidden")}

// --- Local persistence ---
// Saves just enough to rebuild the screen after a refresh. Countdown legs
// (turnChange1/2) simply restart at 3 on restore rather than resuming a
// mid-tick — close enough, and far simpler than reconstructing exact timing.

function saveLocal(){
  if(isSpectator)return;
  if(!stage){try{localStorage.removeItem(LOCAL_KEY)}catch(e){}return}
  try{
    localStorage.setItem(LOCAL_KEY,JSON.stringify({
      players,scores,attempts,turns,quizQuestions,turnIndex,selected,timeLimit,timeLeft,roomCode,stage
    }));
  }catch(e){}
}

function restoreLocal(){
  let data;
  try{data=JSON.parse(localStorage.getItem(LOCAL_KEY)||"null")}catch(e){return false}
  if(!data||!data.stage)return false;

  players=data.players||[]; scores=data.scores||{}; attempts=data.attempts||{};
  turns=data.turns||[]; quizQuestions=data.quizQuestions||[]; turnIndex=data.turnIndex||0;
  selected=(data.selected===undefined)?null:data.selected;
  timeLimit=data.timeLimit||45; roomCode=data.roomCode||null;

  $("landing").classList.add("hidden");
  $("setup").classList.add("hidden");
  $("hamburgerBtn").classList.remove("hidden");
  renderScores();
  showRoomBadge();

  if(data.stage==="question"){
    currentQ=quizQuestions[turnIndex];
    stage="question";
    const player=turns[turnIndex];
    $("playerName").textContent=player;
    $("turnNumber").textContent=turnIndex+1;
    $("questionNumber").textContent=`QUESTION ${turnIndex+1} OF ${quizQuestions.length}`;
    $("questionText").textContent=currentQ.question;
    const wrap=$("questionImageWrap"),img=$("questionImage");
    if(currentQ.image){img.src=currentQ.image;wrap.classList.remove("hidden")}
    else{img.removeAttribute("src");wrap.classList.add("hidden")}
    const box=$("options"); box.innerHTML="";
    currentQ.options.forEach((text,i)=>{
      const b=document.createElement("button");
      b.className="option";
      b.textContent=`${String.fromCharCode(65+i)}. ${text}`;
      b.onclick=()=>answer(i);
      box.appendChild(b);
    });
    $("nextBtn").textContent=turnIndex===quizQuestions.length-1?"Finish Game":"Next Person";
    $("game").classList.remove("hidden");

    if(selected!==null){
      const buttons=[...document.querySelectorAll(".option")];
      buttons.forEach(b=>b.disabled=true);
      if(selected===-1){
        buttons[currentQ.answer].classList.add("correct");
        $("feedback").textContent=`⏰ Time! Correct answer: ${currentQ.options[currentQ.answer]}`;
        $("feedback").className="feedback timeout";
      }else{
        const correct=selected===currentQ.answer;
        buttons[selected].classList.add(correct?"correct":"wrong");
        if(!correct)buttons[currentQ.answer].classList.add("correct");
        $("feedback").textContent=correct?"✓ Correct! +1 point":`✗ Not quite. Correct answer: ${currentQ.options[currentQ.answer]}`;
        $("feedback").className=correct?"feedback good":"feedback bad";
      }
      $("nextBtn").disabled=false;
    }else{
      $("nextBtn").disabled=true;
      startTimer(data.timeLeft!==undefined?data.timeLeft:timeLimit);
    }
  }else if(data.stage==="turnChange1"){
    $("game").classList.add("hidden");
    showTurnChange();
  }else if(data.stage==="turnChange2"){
    $("game").classList.add("hidden");
    turnIndex=data.turnIndex; // showTurnChange would re-derive; call reveal directly
    $("turnChange").classList.remove("hidden");
    revealPlayer();
  }else if(data.stage==="results"){
    finishGame();
  }
  return true;
}

// --- Spectator sync (host side) ---
// One device (this one, if a game was started normally) is "live" — it can
// answer and drive the game. Any other device that opens the same page with
// ?spectate=CODE only ever reads this room's state; it has no way to answer.

async function createRoom(initialState){
  try{
    const res=await fetch("/api/quiz/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(initialState)});
    if(!res.ok)return null;
    const data=await res.json();
    return data.code||null;
  }catch(e){return null}
}

function buildState(phase){
  return {
    phase,
    players,
    scores,
    attempts,
    turnIndex,
    totalQuestions:quizQuestions.length,
    currentPlayer:turns[turnIndex],
    turnPhaseLabel:$("turnPhaseLabel").textContent,
    turnRevealName:$("turnRevealName").textContent,
    turnRevealVisible:!$("turnRevealName").classList.contains("hidden"),
    turnCountdown:$("turnCountdown").textContent,
    question:currentQ?{text:currentQ.question,options:currentQ.options,image:currentQ.image||null}:null,
    selected,
    correctAnswer:(selected!==null&&currentQ)?currentQ.answer:null,
    timeLeft,
    updatedAt:Date.now()
  };
}

function pushState(phase){
  if(!roomCode)return;
  fetch(`/api/quiz/${roomCode}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(buildState(phase))}).catch(()=>{});
}

function showRoomBadge(){
  const badge=$("roomBadge");
  if(!roomCode){badge.classList.add("hidden");return}
  $("roomCodeText").textContent=roomCode;
  badge.classList.remove("hidden");
}

// --- Spectator rendering (viewer side) ---
// Same page, same HTML — driven entirely by polling instead of local game
// logic. Option buttons are disabled and carry no click handler.

function initSpectator(code){
  isSpectator=true;
  roomCode=code;
  document.body.classList.add("spectatorMode");
  renderSpectatorWaiting();
  pollRoom();
  pollTimerId=setInterval(pollRoom,1200);
}

async function pollRoom(){
  try{
    const res=await fetch(`/api/quiz/${roomCode}`,{cache:"no-store"});
    if(!res.ok)return;
    const state=await res.json();
    renderSpectatorState(state);
  }catch(e){/* keep showing the last known state on a transient error */}
}

function hideAllScreens(){
  $("landing").classList.add("hidden");
  $("setup").classList.add("hidden");
  $("game").classList.add("hidden");
  $("turnChange").classList.add("hidden");
  $("results").classList.add("hidden");
  $("battle").classList.add("hidden");
}

function renderSpectatorWaiting(){
  hideAllScreens();
  $("setup").classList.remove("hidden");
  $("setup").innerHTML='<div class="hero center"><p class="eyebrow">SPECTATING</p><h1>Waiting for the host to start&hellip;</h1></div>';
}

function spectatorScoreLine(state,p){return `${(state.scores&&state.scores[p])||0}/${(state.attempts&&state.attempts[p])||0}`}

function renderSpectatorState(state){
  if(!state||state.phase==="setup"){renderSpectatorWaiting();return}

  if(state.phase==="turnChange"){
    hideAllScreens();
    $("turnChange").classList.remove("hidden");
    $("turnPhaseLabel").textContent=state.turnPhaseLabel;
    $("turnCountdown").textContent=state.turnCountdown;
    if(state.turnRevealVisible){
      $("turnRevealName").textContent=state.turnRevealName;
      $("turnRevealName").classList.remove("hidden");
    }else{
      $("turnRevealName").classList.add("hidden");
    }
    return;
  }

  if(state.phase==="question"){
    hideAllScreens();
    $("game").classList.remove("hidden");
    $("playerName").textContent=state.currentPlayer;
    $("turnNumber").textContent=state.turnIndex+1;
    $("questionNumber").textContent=`QUESTION ${state.turnIndex+1} OF ${state.totalQuestions}`;
    $("timer").textContent=state.timeLeft;
    $("scoresBar").innerHTML=state.players.map(p=>`<div class="scoreChip ${p===state.currentPlayer?"active":""}">${escapeHtml(p)}: <strong>${spectatorScoreLine(state,p)}</strong></div>`).join("");

    if(state.question){
      $("questionText").textContent=state.question.text;
      const wrap=$("questionImageWrap"),img=$("questionImage");
      if(state.question.image){img.src=state.question.image;wrap.classList.remove("hidden")}
      else{img.removeAttribute("src");wrap.classList.add("hidden")}

      const box=$("options"); box.innerHTML="";
      state.question.options.forEach((text,i)=>{
        const b=document.createElement("button");
        b.className="option";
        b.disabled=true;
        b.textContent=`${String.fromCharCode(65+i)}. ${text}`;
        if(state.selected!==null&&state.selected!==undefined){
          if(i===state.correctAnswer)b.classList.add("correct");
          else if(i===state.selected)b.classList.add("wrong");
        }
        box.appendChild(b);
      });
    }

    const answered=state.selected!==null&&state.selected!==undefined;
    const correctText=state.question&&state.correctAnswer!==null?state.question.options[state.correctAnswer]:"";
    if(!answered){$("feedback").textContent="";$("feedback").className="feedback"}
    else if(state.selected===-1){$("feedback").textContent=`⏰ Time! Correct answer: ${correctText}`;$("feedback").className="feedback timeout"}
    else if(state.selected===state.correctAnswer){$("feedback").textContent="✓ Correct!";$("feedback").className="feedback good"}
    else{$("feedback").textContent=`✗ Not quite. Correct answer: ${correctText}`;$("feedback").className="feedback bad"}
    return;
  }

  if(state.phase==="results"){
    hideAllScreens();
    $("results").classList.remove("hidden");
    const sorted=[...state.players].sort((a,b)=>((state.scores&&state.scores[b])||0)-((state.scores&&state.scores[a])||0));
    $("finalScores").innerHTML=sorted.map((p,i)=>`<div class="finalRow"><span>${i===0?"🏆 ":""}${escapeHtml(p)}</span><strong>${spectatorScoreLine(state,p)}</strong></div>`).join("");
    return;
  }
}

// --- Battle Mode ---
// Independent players work through the same shared question set at their
// own pace (each device tracks its own current question), but two timers
// are shared: every question gets the same number of seconds to answer,
// and one overall "dead timer" — a single fixed end timestamp handed out
// at room creation — ends the whole battle for every device at once.
//
// battleFrontier = the furthest question this device has genuinely reached
// (this is what's pushed to the leaderboard and what the header counter
// shows). battleIndex = whichever question is currently on screen — it can
// sit anywhere from 0 up to battleFrontier while reviewing past answers.
// battleAnswers[i] holds the resolved answer for question i once it's been
// answered, timed out, or the battle ended while it was still open.

let battleCode=null,battleName=null,battleQuestions=[],battleIndex=0,battleFrontier=0,battleScore=0,battleAttempts=0,battlePollId=null;
let battleAnswers={},battleBookmarks=new Set();
let battleTimePerQ=40,battleQuestionEndsAt=null,battleQuestionTimerId=null;
let battleDeadTimerEndsAt=null,battleDeadTimerId=null,battleDeadTimerExpired=false;
let adminViewCode=null,adminPollId=null;
const BATTLE_LOCAL_KEY="battleStateV1";

function updateDeadTimerDefault(){
  if(!$("battleUseQTimer").checked)return;
  const rounds=Math.max(1,Number($("battleRoundsInput").value)||10);
  const tpq=Math.max(5,Number($("battleTimePerQInput").value)||40);
  $("battleDeadTimerInput").value=Math.max(1,Math.round(rounds*tpq*1.25/60));
}

async function startBattle(){
  const name=($("battleNameInput").value||"").trim();
  const code=($("battleCodeInput").value||"").trim().toUpperCase();
  if(!name){alert("Enter your name.");return}

  if(code){
    // Join an existing battle — inherit its shared timers from the room.
    try{
      const res=await fetch(`/api/battle/${code}`);
      if(!res.ok){alert("Room not found.");return}
      const data=await res.json();
      battleQuestions=data.meta.randomizeOrder?shuffle(data.meta.questions):data.meta.questions;
      battleTimePerQ=data.meta.timePerQuestion;
      battleDeadTimerEndsAt=data.meta.deadTimerEndsAt;
      battleCode=code; battleName=name;
      resetBattleProgress();
      await pushBattleProgress();
      enterBattleScreen();
    }catch(e){alert("Couldn't join — check your connection.")}
  }else{
    // Create a new battle — this device's chosen settings become shared.
    const rounds=Math.max(1,Math.min(40,Number($("battleRoundsInput").value)||10));
    const useQTimer=$("battleUseQTimer").checked;
    const useDeadTimer=$("battleUseDeadTimer").checked;
    const randomizeOrder=$("battleRandomizeOrder").checked;
    const timePerQ=useQTimer?Math.max(5,Math.min(600,Number($("battleTimePerQInput").value)||40)):null;
    const deadTimerMinutes=useDeadTimer?Math.max(1,Math.min(600,Number($("battleDeadTimerInput").value)||10)):null;
    const deadTimerSeconds=deadTimerMinutes?deadTimerMinutes*60:null;
    const pool=allTopics()[$("battleTopicSelect").value]||questions;
    const set=shuffle(pool).slice(0,Math.min(rounds,pool.length));
    try{
      const res=await fetch("/api/battle/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({questions:set,rounds:set.length,hostName:name,useQuestionTimer:useQTimer,timePerQuestion:timePerQ,useDeadTimer,deadTimerSeconds,randomizeOrder})});
      if(!res.ok){alert("Couldn't create a battle — try again.");return}
      const data=await res.json();
      battleCode=data.code; battleName=name;
      battleQuestions=randomizeOrder?shuffle(set):set;
      battleTimePerQ=data.meta.timePerQuestion;
      battleDeadTimerEndsAt=data.meta.deadTimerEndsAt;
      resetBattleProgress();
      enterBattleScreen();
    }catch(e){alert("Couldn't create a battle — check your connection.")}
  }
}

function resetBattleProgress(){
  battleIndex=0; battleFrontier=0; battleScore=0; battleAttempts=0;
  battleAnswers={}; battleBookmarks=new Set(); battleDeadTimerExpired=false;
}

function enterBattleScreen(){
  $("landing").classList.add("hidden");
  $("battle").classList.remove("hidden");
  $("battlePlayerName").textContent=battleName;
  $("battleCodeText").textContent=battleCode;
  $("battleQTotal").textContent=battleQuestions.length;
  startDeadTimer();
  renderBattleQuestion();
  saveBattleLocal();
  pollBattleLeaderboard();
  battlePollId=setInterval(pollBattleLeaderboard,2000);
}

function formatClock(sec){
  const m=Math.floor(sec/60),s=sec%60;
  return `${m}:${s<10?"0":""}${s}`;
}

function startDeadTimer(){
  if(!battleDeadTimerEndsAt){$("battleDeadTimer").textContent="No limit";return}
  clearInterval(battleDeadTimerId);
  tickDeadTimer();
  battleDeadTimerId=setInterval(tickDeadTimer,500);
}

function tickDeadTimer(){
  const remaining=Math.max(0,Math.ceil((battleDeadTimerEndsAt-Date.now())/1000));
  $("battleDeadTimer").textContent=formatClock(remaining);
  if(remaining<=0)endBattleByDeadTimer();
}

// If the question currently "live" never got an answer, mark it resolved
// as unanswered so it stays reviewable rather than stuck mid-air.
function finalizeOpenQuestion(){
  if(battleFrontier<battleQuestions.length && !battleAnswers[battleFrontier]){
    battleAnswers[battleFrontier]={selected:null,correct:false};
  }
}

function endBattleByDeadTimer(){
  if(battleDeadTimerExpired)return;
  battleDeadTimerExpired=true;
  clearInterval(battleDeadTimerId);
  clearInterval(battleQuestionTimerId);
  finalizeOpenQuestion();
  $("battleDoneEyebrow").textContent="TIME'S UP";
  $("battleDoneHeading").textContent="The battle has ended for everyone. You can still review your answers below.";
  pushBattleProgress();
  saveBattleLocal();
  renderBattleQuestion();
}

function startQuestionTimer(){
  if(!battleTimePerQ){$("battleQTimer").textContent="\u221e";return}
  clearInterval(battleQuestionTimerId);
  battleQuestionEndsAt=Date.now()+battleTimePerQ*1000;
  tickQuestionTimer();
  battleQuestionTimerId=setInterval(tickQuestionTimer,500);
}

function tickQuestionTimer(){
  const remaining=Math.max(0,Math.ceil((battleQuestionEndsAt-Date.now())/1000));
  $("battleQTimer").textContent=remaining;
  if(remaining<=0){
    clearInterval(battleQuestionTimerId);
    battleQuestionTimeout();
  }
}

function battleQuestionTimeout(){
  if(battleAnswers[battleIndex]||battleDeadTimerExpired||battleIndex!==battleFrontier)return;
  battleAttempts++;
  battleAnswers[battleIndex]={selected:-1,correct:false};
  $("battleScore").textContent=`${battleScore}/${battleAttempts}`;
  pushBattleProgress();
  saveBattleLocal();
  renderBattleQuestion();
}

function renderBattleQuestion(){
  if(battleIndex>=battleQuestions.length){
    clearInterval(battleQuestionTimerId);
    $("battleQuestionCard").style.display="none";
    $("battleDoneCard").style.display="block";
    if(!battleDeadTimerExpired){
      $("battleDoneEyebrow").textContent="YOU'RE DONE";
      $("battleDoneHeading").textContent="Waiting on the others\u2026";
    }
    return;
  }
  $("battleQuestionCard").style.display="";
  $("battleDoneCard").style.display="none";
  const q=battleQuestions[battleIndex];
  const resolved=battleAnswers[battleIndex];
  const isLive=!battleDeadTimerExpired&&battleIndex===battleFrontier&&!resolved;

  $("battleQuestionNumber").textContent=`Question ${battleIndex+1}`;
  $("battleQNum").textContent=Math.min(battleFrontier+1,battleQuestions.length);
  $("battleQuestionText").textContent=q.question;
  const wrap=$("battleImageWrap"),img=$("battleImage");
  if(q.image){img.src=q.image;wrap.classList.remove("hidden")}
  else{img.removeAttribute("src");wrap.classList.add("hidden")}

  const box=$("battleOptions"); box.innerHTML="";
  q.options.forEach((text,i)=>{
    const b=document.createElement("button");
    b.className="option";
    b.textContent=`${String.fromCharCode(65+i)}. ${text}`;
    if(resolved){
      b.disabled=true;
      if(i===q.answer)b.classList.add("correct");
      else if(resolved.selected!==null&&i===resolved.selected)b.classList.add("wrong");
    }else if(isLive){
      b.onclick=()=>answerBattle(i);
    }else{
      b.disabled=true;
    }
    box.appendChild(b);
  });

  if(resolved){
    if(resolved.selected===null){$("battleFeedback").textContent=`The battle ended before you answered. Correct answer: ${q.options[q.answer]}`;$("battleFeedback").className="feedback timeout"}
    else if(resolved.selected===-1){$("battleFeedback").textContent=`⏰ Time! Correct answer: ${q.options[q.answer]}`;$("battleFeedback").className="feedback timeout"}
    else if(resolved.correct){$("battleFeedback").textContent="✓ Correct! +1 point";$("battleFeedback").className="feedback good"}
    else{$("battleFeedback").textContent=`✗ Not quite. Correct answer: ${q.options[q.answer]}`;$("battleFeedback").className="feedback bad"}
  }else{
    $("battleFeedback").textContent=""; $("battleFeedback").className="feedback";
  }

  $("battlePrevBtn").disabled=battleIndex<=0;
  if(isLive){
    $("battleNextBtn").disabled=true;
    $("battleNextBtn").textContent="Choose an answer";
    startQuestionTimer();
  }else{
    clearInterval(battleQuestionTimerId);
    $("battleQTimer").textContent="\u2013";
    $("battleNextBtn").disabled=false;
    $("battleNextBtn").textContent=(battleIndex===battleFrontier&&battleIndex+1>=battleQuestions.length)?"Finish":"Next Question";
  }

  updateBookmarkBtn();
}

function answerBattle(index){
  if(battleAnswers[battleIndex]||battleDeadTimerExpired||battleIndex!==battleFrontier)return;
  clearInterval(battleQuestionTimerId);
  const q=battleQuestions[battleIndex];
  const correct=index===q.answer;
  battleAttempts++;
  if(correct)battleScore++;
  battleAnswers[battleIndex]={selected:index,correct};
  $("battleScore").textContent=`${battleScore}/${battleAttempts}`;
  pushBattleProgress();
  saveBattleLocal();
  renderBattleQuestion();
}

function battlePrevious(){
  if(battleIndex<=0)return;
  battleIndex--;
  renderBattleQuestion();
}

function battleNext(){
  if(battleIndex<battleFrontier){
    battleIndex++;
    renderBattleQuestion();
    return;
  }
  if(!battleAnswers[battleIndex])return;
  battleFrontier=Math.min(battleFrontier+1,battleQuestions.length);
  battleIndex=battleFrontier;
  if(battleIndex>=battleQuestions.length)pushBattleProgress();
  saveBattleLocal();
  renderBattleQuestion();
}

function updateBookmarkBtn(){
  const bookmarked=battleBookmarks.has(battleIndex);
  const btn=$("battleBookmarkBtn");
  btn.textContent=bookmarked?"\u2605 Bookmarked":"\u2606 Bookmark";
  btn.classList.toggle("bookmarked",bookmarked);
}

function toggleBattleBookmark(){
  if(battleBookmarks.has(battleIndex))battleBookmarks.delete(battleIndex);
  else battleBookmarks.add(battleIndex);
  updateBookmarkBtn();
  saveBattleLocal();
}

function renderBattleHamburgerIndex(){
  const box=$("battleQuestionIndex"); box.innerHTML="";
  const grid=document.createElement("div");
  grid.className="qIndexGrid";
  battleQuestions.forEach((q,i)=>{
    const locked=i>battleFrontier;
    const b=document.createElement("button");
    b.type="button";
    b.textContent=i+1;
    b.className="qIndexBtn"+(i===battleIndex?" current":"")+(battleBookmarks.has(i)?" bookmarked":"")+(locked?" locked":"");
    b.disabled=locked;
    if(!locked)b.onclick=()=>{battleIndex=i;closeBattleMenu();renderBattleQuestion()};
    grid.appendChild(b);
  });
  box.appendChild(grid);
}

function openBattleMenu(){
  renderBattleHamburgerIndex();
  $("battleHamburgerPanel").classList.remove("hidden");
}
function closeBattleMenu(){$("battleHamburgerPanel").classList.add("hidden")}

function submitAndReviewBattle(){
  closeBattleMenu();
  battleIndex=0;
  renderBattleQuestion();
}

function endTestForSelf(){
  if(!confirm("End your test and return to the home screen?"))return;
  closeBattleMenu();
  finalizeOpenQuestion();
  clearInterval(battleQuestionTimerId);
  clearInterval(battleDeadTimerId);
  clearInterval(battlePollId);
  pushBattleProgress();
  clearBattleLocal();
  battleCode=null;
  $("battle").classList.add("hidden");
  $("landing").classList.remove("hidden");
}

async function pushBattleProgress(){
  if(!battleCode||!battleName)return;
  try{
    await fetch(`/api/battle/${battleCode}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:battleName,score:battleScore,attempts:battleAttempts,currentIndex:battleFrontier,answers:battleAnswers,bookmarks:[...battleBookmarks]})});
  }catch(e){}
}

async function pollBattleLeaderboard(){
  if(!battleCode)return;
  try{
    const res=await fetch(`/api/battle/${battleCode}`,{cache:"no-store"});
    if(!res.ok)return;
    const data=await res.json();
    // An admin may have changed the shared per-question timer — adopt it
    // for whichever question comes next (never retroactively).
    if(data.meta&&data.meta.timePerQuestion!==battleTimePerQ)battleTimePerQ=data.meta.timePerQuestion;
    const names=Object.keys(data.players||{});
    const sorted=names.sort((a,b)=>(data.players[b].score||0)-(data.players[a].score||0));
    $("battleLeaderboard").innerHTML=sorted.map((n,i)=>{
      const p=data.players[n];
      const total=data.meta&&data.meta.questions?data.meta.questions.length:battleQuestions.length;
      return `<div class="finalRow"><span>${i===0?"🏆 ":""}${escapeHtml(n)} <small>(${p.currentIndex}/${total})</small></span><strong>${p.score||0}/${p.attempts||0}</strong></div>`;
    }).join("");
  }catch(e){}
}

// --- Battle persistence ---
// Keeps a battle on screen across a refresh; only "End Test" clears it and
// sends the device back to the landing screen.

function saveBattleLocal(){
  if(!battleCode)return;
  try{
    localStorage.setItem(BATTLE_LOCAL_KEY,JSON.stringify({
      battleCode,battleName,battleQuestions,battleFrontier,battleIndex,battleScore,battleAttempts,
      battleAnswers,battleBookmarks:[...battleBookmarks],battleTimePerQ,battleDeadTimerEndsAt,
      battleQuestionEndsAt,battleDeadTimerExpired
    }));
  }catch(e){}
}
function clearBattleLocal(){try{localStorage.removeItem(BATTLE_LOCAL_KEY)}catch(e){}}

function restoreBattleLocal(){
  let data;
  try{data=JSON.parse(localStorage.getItem(BATTLE_LOCAL_KEY)||"null")}catch(e){return false}
  if(!data||!data.battleCode)return false;

  battleCode=data.battleCode; battleName=data.battleName; battleQuestions=data.battleQuestions||[];
  battleFrontier=data.battleFrontier||0; battleIndex=data.battleIndex||0;
  battleScore=data.battleScore||0; battleAttempts=data.battleAttempts||0;
  battleAnswers=data.battleAnswers||{};
  battleBookmarks=new Set(data.battleBookmarks||[]);
  battleTimePerQ=data.battleTimePerQ; battleDeadTimerEndsAt=data.battleDeadTimerEndsAt;
  battleDeadTimerExpired=!!data.battleDeadTimerExpired;

  $("landing").classList.add("hidden");
  $("battle").classList.remove("hidden");
  $("battlePlayerName").textContent=battleName;
  $("battleCodeText").textContent=battleCode;
  $("battleQTotal").textContent=battleQuestions.length;
  $("battleScore").textContent=`${battleScore}/${battleAttempts}`;

  startDeadTimer();
  renderBattleQuestion();
  // If a live per-question timer was mid-countdown, correct it to the real
  // remaining time (renderBattleQuestion above already started a fresh
  // full-length one) — this also fires the timeout immediately if the
  // saved deadline had already passed while the tab was closed.
  if(data.battleQuestionEndsAt&&battleIndex===battleFrontier&&!battleAnswers[battleIndex]&&!battleDeadTimerExpired){
    battleQuestionEndsAt=data.battleQuestionEndsAt;
    tickQuestionTimer();
  }
  pollBattleLeaderboard();
  battlePollId=setInterval(pollBattleLeaderboard,2000);
  return true;
}

// --- Admin view ---
// Password-gated (checked server-side, never in this file), read-only for
// contestant identity — admin GETs the room like anyone can, but never
// POSTs a player entry, so no name ever appears on the leaderboard. The
// one write it can make is the global per-question time change, and that
// POST carries the password again so the server re-checks it every time.

const ADMIN_PW_KEY="quizAdminPw";
let adminSelectedTeam=null,adminAnswerKeyData=null;

async function viewAsAdmin(code){
  if(!code)return;
  adminViewCode=code.toUpperCase();
  $("landing").classList.add("hidden");
  $("battleAdminView").classList.remove("hidden");
  $("adminCodeText").textContent=adminViewCode;

  const savedPw=sessionStorage.getItem(ADMIN_PW_KEY);
  if(savedPw&&await checkAdminPassword(savedPw)){
    unlockAdminView();
  }
}

async function checkAdminPassword(pw){
  try{
    const res=await fetch("/api/battle/admin-check",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pw})});
    if(!res.ok)return false;
    const data=await res.json();
    return !!data.ok;
  }catch(e){return false}
}

async function submitAdminPassword(){
  const pw=($("adminPasswordInput").value||"").trim();
  if(!pw)return;
  const ok=await checkAdminPassword(pw);
  if(!ok){$("adminAuthError").classList.remove("hidden");return}
  $("adminAuthError").classList.add("hidden");
  try{sessionStorage.setItem(ADMIN_PW_KEY,pw)}catch(e){}
  unlockAdminView();
}

function unlockAdminView(){
  $("adminAuthGate").classList.add("hidden");
  $("adminAuthedContent").classList.remove("hidden");
  pollAdminView();
  adminPollId=setInterval(pollAdminView,2000);
}

async function pollAdminView(){
  if(!adminViewCode)return;
  try{
    const res=await fetch(`/api/battle/${adminViewCode}`,{cache:"no-store"});
    if(!res.ok){$("adminTeamList").innerHTML='<p class="small">Room not found.</p>';return}
    const data=await res.json();
    adminAnswerKeyData=data.meta;
    renderAdminTeamList(data);
    if(adminSelectedTeam)renderAdminTeamDetail(data);
    if(!$("adminAnswerKey").classList.contains("hidden"))renderAdminAnswerKey();
  }catch(e){}
}

function renderAdminTeamList(data){
  const names=Object.keys(data.players||{});
  const sorted=names.sort((a,b)=>(data.players[b].score||0)-(data.players[a].score||0));
  const total=data.meta&&data.meta.questions?data.meta.questions.length:0;
  $("adminTeamList").innerHTML="";
  if(!sorted.length){$("adminTeamList").innerHTML='<p class="small">No one has joined yet.</p>';return}
  sorted.forEach((n,i)=>{
    const p=data.players[n];
    const row=document.createElement("div");
    row.className="finalRow";
    row.style.cursor="pointer";
    if(n===adminSelectedTeam)row.style.borderColor="var(--accent)";
    row.innerHTML=`<span>${i===0?"🏆 ":""}${escapeHtml(n)} <small>(${p.currentIndex}/${total})</small></span><strong>${p.score||0}/${p.attempts||0}</strong>`;
    row.onclick=()=>{adminSelectedTeam=n;renderAdminTeamDetail(data)};
    $("adminTeamList").appendChild(row);
  });
}

function renderAdminTeamDetail(data){
  const p=data.players[adminSelectedTeam];
  if(!p){adminSelectedTeam=null;$("adminTeamDetail").classList.add("hidden");return}
  $("adminTeamDetail").classList.remove("hidden");
  $("adminDetailName").textContent=adminSelectedTeam;
  const lastActive=p.updatedAt?new Date(p.updatedAt).toLocaleTimeString():"—";
  const bookmarks=(p.bookmarks||[]).map(i=>i+1).join(", ")||"none";
  $("adminDetailSummary").textContent=`Score ${p.score||0}/${p.attempts||0} \u00b7 last active ${lastActive} \u00b7 bookmarked: ${bookmarks}`;

  const questions=(data.meta&&data.meta.questions)||[];
  const answers=p.answers||{};
  $("adminDetailAnswers").innerHTML=questions.map((q,i)=>{
    const a=answers[i];
    if(!a)return `<div class="finalRow"><span>Q${i+1}</span><small>not reached</small></div>`;
    const status=a.selected===null?"skipped (battle ended)":a.selected===-1?"timed out":a.correct?"correct":"wrong";
    return `<div class="finalRow"><span>Q${i+1}</span><small>${status}</small></div>`;
  }).join("");
}

function renderAdminAnswerKey(){
  if(!adminAnswerKeyData||!adminAnswerKeyData.questions)return;
  $("adminAnswerKey").innerHTML=adminAnswerKeyData.questions.map((q,i)=>
    `<div class="card" style="margin-bottom:10px"><strong>Q${i+1}. ${escapeHtml(q.question)}</strong><div style="margin-top:6px">${
      q.options.map((o,j)=>`<div${j===q.answer?' style="color:var(--correct);font-weight:800"':''}>${j===q.answer?"✓ ":""}${escapeHtml(o)}</div>`).join("")
    }</div></div>`
  ).join("");
}

async function applyAdminTime(){
  const pw=sessionStorage.getItem(ADMIN_PW_KEY);
  if(!pw||!adminViewCode)return;
  const raw=$("adminTimeInput").value;
  const timePerQuestion=raw?Math.max(5,Math.min(600,Number(raw))):null;
  try{
    const res=await fetch(`/api/battle/${adminViewCode}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adminPassword:pw,timePerQuestion})});
    if(!res.ok){alert("Couldn't update — check the password is still valid.");return}
    $("adminTimeStatus").classList.remove("hidden");
    setTimeout(()=>$("adminTimeStatus").classList.add("hidden"),2000);
  }catch(e){alert("Couldn't update — check your connection.")}
}

$("adminAuthBtn").onclick=submitAdminPassword;
$("adminApplyTimeBtn").onclick=applyAdminTime;
$("adminToggleKeyBtn").onclick=()=>{
  const showing=!$("adminAnswerKey").classList.contains("hidden");
  $("adminAnswerKey").classList.toggle("hidden",showing);
  $("adminToggleKeyBtn").textContent=showing?"Show Questions & Answers":"Hide Questions & Answers";
  if(!showing)renderAdminAnswerKey();
};

$("adminBackBtn").onclick=()=>{
  clearInterval(adminPollId);
  adminViewCode=null; adminSelectedTeam=null; adminAnswerKeyData=null;
  $("adminAuthGate").classList.remove("hidden");
  $("adminAuthedContent").classList.add("hidden");
  $("adminTeamDetail").classList.add("hidden");
  $("adminAnswerKey").classList.add("hidden");
  $("adminToggleKeyBtn").textContent="Show Questions & Answers";
  $("adminPasswordInput").value="";
  $("battleAdminView").classList.add("hidden");
  $("landing").classList.remove("hidden");
};

if(__spectateCode){
  initSpectator(__spectateCode);
}else if(__adminCode){
  viewAsAdmin(__adminCode);
}else{
  $("participantCount").addEventListener("input",renderNameInputs);
  renderNameInputs();
  populateTopicSelect($("soloTopicSelect"));
  populateTopicSelect($("battleTopicSelect"));
  $("landingImportBtn").onclick=showImportScreen;
  $("backFromImportBtn").onclick=backFromImport;
  $("copyAiPromptBtn").onclick=copyAiPrompt;
  $("saveImportBtn").onclick=saveImportedTopic;
  $("startBtn").onclick=startGame;
  $("nextBtn").onclick=nextTurn;
  $("playAgain").onclick=()=>{
    stage=null; roomCode=null;
    try{localStorage.removeItem(LOCAL_KEY)}catch(e){}
    $("results").classList.add("hidden");
    $("setup").classList.remove("hidden");
    $("roomBadge").classList.add("hidden");
    $("hamburgerBtn").classList.add("hidden");
  };
  $("copyLinkBtn").onclick=()=>{
    if(!roomCode)return;
    const url=`${location.origin}${location.pathname}?spectate=${roomCode}`;
    navigator.clipboard.writeText(url).then(()=>{
      const btn=$("copyLinkBtn"),prev=btn.textContent;
      btn.textContent="Copied!";
      setTimeout(()=>{btn.textContent=prev},1500);
    }).catch(()=>{});
  };
  $("hamburgerBtn").onclick=openMenu;
  $("closeMenuBtn").onclick=closeMenu;
  $("applyTimeBtn").onclick=applyTimeLimit;
  $("addParticipantBtn").onclick=addParticipant;
  $("endGameBtn").onclick=endGame;

  $("landingStartBtn").onclick=()=>{
    $("landing").classList.add("hidden");
    $("setup").classList.remove("hidden");
  };
  $("landingSpectateBtn").onclick=()=>{$("spectateEntry").classList.remove("hidden")};
  $("spectateJoinBtn").onclick=()=>{
    const code=($("spectateCodeInput").value||"").trim().toUpperCase();
    if(!code)return;
    location.href=`${location.pathname}?spectate=${code}`;
  };
  $("landingBattleBtn").onclick=()=>{
    $("battleEntry").classList.remove("hidden");
    updateDeadTimerDefault();
  };
  $("battleRoundsInput").addEventListener("input",updateDeadTimerDefault);
  $("battleTimePerQInput").addEventListener("input",updateDeadTimerDefault);
  $("battleUseQTimer").addEventListener("change",()=>{
    $("battleTimePerQInput").classList.toggle("hidden",!$("battleUseQTimer").checked);
    updateDeadTimerDefault();
  });
  $("battleUseDeadTimer").addEventListener("change",()=>{
    $("battleDeadTimerInput").classList.toggle("hidden",!$("battleUseDeadTimer").checked);
  });
  $("battleGoBtn").onclick=startBattle;
  $("battleNextBtn").onclick=battleNext;
  $("battlePrevBtn").onclick=battlePrevious;
  $("battleBookmarkBtn").onclick=toggleBattleBookmark;
  $("battleHamburgerBtn").onclick=openBattleMenu;
  $("closeBattleMenuBtn").onclick=closeBattleMenu;
  $("battleSubmitReviewBtn").onclick=submitAndReviewBattle;
  $("battleEndTestBtn").onclick=endTestForSelf;
  $("battleReviewFromDoneBtn").onclick=()=>{
    battleIndex=Math.max(0,battleQuestions.length-1);
    renderBattleQuestion();
  };
  $("battleCopyBtn").onclick=()=>{
    if(!battleCode)return;
    navigator.clipboard.writeText(battleCode).then(()=>{
      const btn=$("battleCopyBtn"),prev=btn.textContent;
      btn.textContent="Copied!";
      setTimeout(()=>{btn.textContent=prev},1500);
    }).catch(()=>{});
  };

  // Hide the room badge / hamburger while scrolling down (they'd otherwise
  // sit on top of question content on a long page); reappear on scroll up.
  let __lastScrollY=window.scrollY||0;
  window.addEventListener("scroll",()=>{
    const y=window.scrollY||0;
    const hide=y>__lastScrollY&&y>40;
    $("roomBadge").classList.toggle("scrolled",hide);
    $("hamburgerBtn").classList.toggle("scrolled",hide);
    __lastScrollY=y;
  });

  if(restoreBattleLocal()){
    // battle session restored, landing already hidden inside restoreBattleLocal
  }else if(restoreLocal()){
    $("landing").classList.add("hidden");
  }
}
