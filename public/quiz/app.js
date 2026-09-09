let players=[],scores={},attempts={},turns=[],turnIndex=0,quizQuestions=[],currentQ=null,selected=null,timerId=null,timeLeft=45,timeLimit=45,turnTimerId=null,stage=null;
let roomCode=null,isSpectator=false,pollTimerId=null;
const $=id=>document.getElementById(id);
const LOCAL_KEY="quizStateV1";

const __params=new URLSearchParams(location.search);
const __spectateCode=(__params.get("spectate")||"").toUpperCase();

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
  // Shuffle the question order independently, while keeping the balanced player schedule.
  quizQuestions=shuffle(questions);
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
  quizQuestions=shuffle(questions);
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
  showQuestion();
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
  if(selected!==null)return;
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
  try{data=JSON.parse(localStorage.getItem(LOCAL_KEY)||"null")}catch(e){return}
  if(!data||!data.stage)return;

  players=data.players||[]; scores=data.scores||{}; attempts=data.attempts||{};
  turns=data.turns||[]; quizQuestions=data.quizQuestions||[]; turnIndex=data.turnIndex||0;
  selected=(data.selected===undefined)?null:data.selected;
  timeLimit=data.timeLimit||45; roomCode=data.roomCode||null;

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
  $("setup").classList.add("hidden");
  $("game").classList.add("hidden");
  $("turnChange").classList.add("hidden");
  $("results").classList.add("hidden");
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

if(__spectateCode){
  initSpectator(__spectateCode);
}else{
  $("participantCount").addEventListener("input",renderNameInputs);
  renderNameInputs();
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
  restoreLocal();
}
