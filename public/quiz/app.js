let players=[],scores={},turns=[],turnIndex=0,quizQuestions=[],currentQ=null,selected=null,timerId=null,timeLeft=45,turnTimerId=null;
let roomCode=null,isSpectator=false,pollTimerId=null;
const $=id=>document.getElementById(id);

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
  timeLeft=Math.max(5,Math.min(600,Number($("timeLimit").value)||45));
  scores={}; players.forEach(p=>scores[p]=0);
  quizQuestions=shuffle(questions);
  buildTurns();
  turnIndex=0;
  $("setup").classList.add("hidden");
  $("results").classList.add("hidden");
  $("turnChange").classList.add("hidden");
  $("game").classList.remove("hidden");
  renderScores();
  roomCode=await createRoom({phase:"setup",players,scores});
  showRoomBadge();
  showQuestion();
}

function showQuestion(){
  clearInterval(timerId);
  selected=null;
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
}

function startTimer(){
  timeLeft=Math.max(5,Math.min(600,Number($("timeLimit").value)||45));
  updateTimer();
  timerId=setInterval(()=>{
    timeLeft--;
    updateTimer();
    pushState("question");
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
  if(correct){scores[player]++;$("feedback").textContent="✓ Correct! +1 point";$("feedback").className="feedback good"}
  else{$("feedback").textContent=`✗ Not quite. Correct answer: ${currentQ.options[currentQ.answer]}`;$("feedback").className="feedback bad"}
  $("nextBtn").disabled=false;
  renderScores();
  pushState("question");
}

function timeout(){
  if(selected!==null)return;
  selected=-1;
  const buttons=[...document.querySelectorAll(".option")];
  buttons.forEach(b=>b.disabled=true);
  buttons[currentQ.answer].classList.add("correct");
  $("feedback").textContent=`⏰ Time! Correct answer: ${currentQ.options[currentQ.answer]}`;
  $("feedback").className="feedback timeout";
  $("nextBtn").disabled=false;
  pushState("question");
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
  $("game").classList.add("hidden");
  $("turnChange").classList.remove("hidden");
  $("turnRevealName").classList.add("hidden");
  $("turnPhaseLabel").textContent="NEXT PERSON IN";
  $("turnCountdown").classList.remove("hidden");
  runCountdown(3, revealPlayer, "turnChange");
}

function revealPlayer(){
  const player=turns[turnIndex];
  $("turnPhaseLabel").textContent="UP NEXT";
  $("turnRevealName").textContent=player;
  $("turnRevealName").classList.remove("hidden");
  $("turnCountdown").classList.remove("hidden");
  playBeep("reveal");
  runCountdown(3, ()=>{
    $("turnChange").classList.add("hidden");
    $("game").classList.remove("hidden");
    showQuestion();
  }, "turnChange");
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

function renderScores(){
  $("scoresBar").innerHTML=players.map(p=>`<div class="scoreChip ${p===turns[turnIndex]?"active":""}">${escapeHtml(p)}: <strong>${scores[p]}</strong></div>`).join("");
}

function finishGame(){
  clearInterval(timerId);
  clearInterval(turnTimerId);
  $("game").classList.add("hidden");
  $("turnChange").classList.add("hidden");
  $("results").classList.remove("hidden");
  const sorted=[...players].sort((a,b)=>scores[b]-scores[a]);
  $("finalScores").innerHTML=sorted.map((p,i)=>`<div class="finalRow"><span>${i===0?"🏆 ":""}${escapeHtml(p)}</span><strong>${scores[p]}</strong></div>`).join("");
  pushState("results");
}

function escapeHtml(v){const d=document.createElement("div");d.textContent=v;return d.innerHTML}

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
    $("scoresBar").innerHTML=state.players.map(p=>`<div class="scoreChip ${p===state.currentPlayer?"active":""}">${escapeHtml(p)}: <strong>${state.scores[p]}</strong></div>`).join("");

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
    if(!answered){$("feedback").textContent="";$("feedback").className="feedback"}
    else if(state.selected===-1){$("feedback").textContent="⏰ Time's up";$("feedback").className="feedback timeout"}
    else if(state.selected===state.correctAnswer){$("feedback").textContent="✓ Correct!";$("feedback").className="feedback good"}
    else{$("feedback").textContent="✗ Not quite";$("feedback").className="feedback bad"}
    return;
  }

  if(state.phase==="results"){
    hideAllScreens();
    $("results").classList.remove("hidden");
    const sorted=[...state.players].sort((a,b)=>state.scores[b]-state.scores[a]);
    $("finalScores").innerHTML=sorted.map((p,i)=>`<div class="finalRow"><span>${i===0?"🏆 ":""}${escapeHtml(p)}</span><strong>${state.scores[p]}</strong></div>`).join("");
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
  $("playAgain").onclick=()=>{$("results").classList.add("hidden");$("setup").classList.remove("hidden");$("roomBadge").classList.add("hidden");roomCode=null};
  $("copyLinkBtn").onclick=()=>{
    if(!roomCode)return;
    const url=`${location.origin}${location.pathname}?spectate=${roomCode}`;
    navigator.clipboard.writeText(url).then(()=>{
      const btn=$("copyLinkBtn"),prev=btn.textContent;
      btn.textContent="Copied!";
      setTimeout(()=>{btn.textContent=prev},1500);
    }).catch(()=>{});
  };
}
