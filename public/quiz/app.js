let players=[],scores={},turns=[],turnIndex=0,quizQuestions=[],currentQ=null,selected=null,timerId=null,timeLeft=45,turnTimerId=null;
const $=id=>document.getElementById(id);

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
$("participantCount").addEventListener("input",renderNameInputs);
renderNameInputs();

function buildTurns(){
  // Shuffle participants, then deal turn slots round-robin.
  // Therefore everyone receives either floor(Q/P) or ceil(Q/P) turns.
  const order=shuffle(players);
  turns=[];
  for(let i=0;i<quizQuestions.length;i++) turns.push(order[i%order.length]);
  // Shuffle the question order independently, while keeping the balanced player schedule.
  quizQuestions=shuffle(questions);
}

function startGame(){
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
}

function startTimer(){
  timeLeft=Math.max(5,Math.min(600,Number($("timeLimit").value)||45));
  updateTimer();
  timerId=setInterval(()=>{
    timeLeft--;
    updateTimer();
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
  runCountdown(3, revealPlayer);
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
  });
}

// Counts a number down to zero, beeping each tick, then calls onDone.
// (Never displays "0" itself — matches the 30 Seconds ready-screen feel.)
function runCountdown(from, onDone){
  let n=from;
  $("turnCountdown").textContent=n;
  playBeep("tick");
  turnTimerId=setInterval(()=>{
    n--;
    if(n>0){
      $("turnCountdown").textContent=n;
      playBeep("tick");
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
}

function escapeHtml(v){const d=document.createElement("div");d.textContent=v;return d.innerHTML}

$("startBtn").onclick=startGame;
$("nextBtn").onclick=nextTurn;
$("playAgain").onclick=()=>{$("results").classList.add("hidden");$("setup").classList.remove("hidden")};
