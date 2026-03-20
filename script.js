let reportLoading = false;
window.onload = function () {

let today =
new Date().toISOString().slice(0,10);

let dateInput =
document.getElementById("date");

if (dateInput) {
dateInput.value = today;
}

loadStudents();

setTimeout(()=>{
loadReport();
loadStudentReport();
loadStudentSummary();
loadHistory();
loadChart();
},100);

};


let marked = {};
let studentTotal = 0;


// default teacher if no login
 role =
localStorage.getItem("role") || "teacher";

let username =
localStorage.getItem("username") || "";


// ---------- SAFE GET ----------

function getSubject(){

let el=document.getElementById("subject");
return el ? el.value : "";

}

function getDate(){

 let el=document.getElementById("date");
return el ? el.value : "";

}


// ---------- LOAD STUDENTS ----------

function loadStudents() {

fetch("/students")
.then(res => res.json())
.then(data => {

let div =
document.getElementById("studentsTable");

if (!div) return;

div.innerHTML = `
<tr>
<th>Name</th>
<th>Present</th>
<th>Absent</th>
<th>Attendance</th>
</tr>
`;

studentTotal = 0;

data.forEach(s => {

if (role === "student") {

if (!username) return;

if (
s.name.toLowerCase().trim()
!== username.toLowerCase().trim()
) return;

}

studentTotal++;


// ✅ restore marked state
if(localStorage.getItem("marked_"+s.id)){

marked[s.id] = true;

}else{

marked[s.id] = false;

}


div.innerHTML += `

<tr id="row${s.id}">

<td>${s.name}</td>

<td>
<button class="presentBtn"
id="p${s.id}"
onclick="mark(${s.id},'Present')">
P
</button>
</td>

<td>
<button class="absentBtn"
id="a${s.id}"
onclick="mark(${s.id},'Absent')">
A
</button>
</td>

<td>
<span id="percent${s.id}"></span>
</td>

</tr>

`;


// ✅ disable buttons if already marked
if(marked[s.id]){

let p =
document.getElementById("p"+s.id);

let a =
document.getElementById("a"+s.id);

if(p) p.disabled = true;
if(a) a.disabled = true;

}

});

setTimeout(toggleButtons,50);

});

}


// ---------- MARK ----------

function mark(id,status){

if (role !== "teacher") {
alert("Only teacher can mark");
return;
}


// 🔒 lock subject + date while marking

let subjectSelect =
document.getElementById("subject");

let dateInput =
document.getElementById("date");

if(subjectSelect)
subjectSelect.disabled = true;

if(dateInput)
dateInput.disabled = true;


// ✅ mark round started
localStorage.setItem("roundInProgress","1");


if(marked[id]) return;

marked[id] = true;

// ✅ save marked state
localStorage.setItem("marked_"+id,"1");


let p=document.getElementById("p"+id);
let a=document.getElementById("a"+id);

if(p) p.disabled=true;
if(a) a.disabled=true;

fetch("/attendance",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

student_id:id,
status:status,
subject:getSubject(),
date:getDate()

})

})
.then(()=>checkRoundComplete());

}
// ---------- ROUND ----------

function checkRoundComplete(){

let count=0;

for(let id in marked){

if(marked[id]) count++;

}

if(count===studentTotal){

for(let id in marked){

marked[id]=false;

// ✅ remove saved marked state
localStorage.removeItem("marked_"+id);

let p=document.getElementById("p"+id);
let a=document.getElementById("a"+id);

if(p) p.disabled=false;
if(a) a.disabled=false;

}


// 🔓 unlock subject + date after round

let subjectSelect =
document.getElementById("subject");

let dateInput =
document.getElementById("date");

if(subjectSelect)
subjectSelect.disabled = false;

if(dateInput)
dateInput.disabled = false;


// ✅ round finished
localStorage.removeItem("roundInProgress");


reloadAll();

}

}

// ---------- URL ----------

function buildUrl(base,subject,date){

let url=base;

if(subject!=="")
url+="?subject="+subject;

if(date)
url+=(url.includes("?")?"&":"?")
+"date="+date;

return url;

}


// ---------- REPORT ----------

function loadReport(){

let subject=getSubject();
let date=getDate();


// ✅ new report type
let typeEl =
document.getElementById("reportType");

let type =
typeEl ? typeEl.value : "day";


// ✅ use new API if not day
let url;

if(type === "day"){

url =
buildUrl("/report",subject,date);

}else{

url =
"/reportRange?date="
+date+
"&type="+type+
"&subject="+subject;

}


fetch(url)
.then(r=>r.json())
.then(data=>{

let t=document.getElementById("totalClass");
let p=document.getElementById("presentCount");
let a=document.getElementById("absentCount");
let pr=document.getElementById("percent");

if(!t||!p||!a||!pr) return;


// teacher → show all
if(role === "teacher"){

t.innerText=data.totalClasses;
p.innerText=data.present;
a.innerText=data.absent;

let percent=0;

if(data.totalClasses>0){
percent =
data.present /
(data.present+data.absent||1) * 100;
}

pr.innerText = percent.toFixed(0);

return;
}


// student → calculate from history
fetch("/history")
.then(r=>r.json())
.then(hist=>{

let present = 0;
let absent = 0;

hist.forEach(h=>{

if(
h.name.toLowerCase().trim()
=== username.toLowerCase().trim()
){

// subject filter
if(subject && subject!="" && h.subject!==subject)
return;

// date filter (only for day)
if(type==="day" && date && h.date!==date)
return;


if(h.status==="Present") present++;
else absent++;

}

});

let total = present + absent;

let percent = 0;

if(total>0){
percent = (present/total)*100;
}

t.innerText = total;
p.innerText = present;
a.innerText = absent;
pr.innerText = percent.toFixed(0);

});

});

}


// ---------- STUDENT REPORT ----------

function loadStudentReport(){
if(reportLoading) return;
reportLoading = true;
let subject=getSubject();
let date=getDate();

fetch("/history")
.then(r=>r.json())
.then(hist=>{

let map = {};

hist.forEach(h=>{

// subject filter
if(subject && subject!="" && h.subject!==subject)
return;

// date filter
if(date && h.date!==date)
return;


// student login filter
if(role==="student"){

if(
h.name.toLowerCase().trim()
!== username.toLowerCase().trim()
) return;

}


// create object
if(!map[h.student_id]){

map[h.student_id] = {
present:0,
total:0
};

}


// count total classes
map[h.student_id].total++;


// count present
if(h.status==="Present")
map[h.student_id].present++;

});


// update UI

for(let id in map){

let present = map[id].present;
let total = map[id].total;

let percent = 0;

if(total>0)
percent = (present/total)*100;

if(percent>100)
percent=100;

if(percent<0 || isNaN(percent))
percent=0;


let el =
document.getElementById("percent"+id);

if(!el) continue;


let color="green";
let warn="";

if(percent<50){
color="red";
warn="LOW";
}
else if(percent<75){
color="orange";
warn="WARN";
}


// create bar once if not exists
if(!el.querySelector(".bar")){

el.innerHTML = `
<div class="bar">
<div class="fill"></div>
</div>
<span class="percentText"></span>
<span class="warn"></span>
`;

}

let fill = el.querySelector(".fill");
let text = el.querySelector(".percentText");
let warnEl = el.querySelector(".warn");

fill.style.width = percent + "%";
fill.style.background = color;

text.innerText = percent.toFixed(0) + "%";
warnEl.innerText = warn;

}
reportLoading = false;
});

}

// ---------- HISTORY ----------

function loadHistory(){

let subject=getSubject();
let date=getDate();

let url=
buildUrl("/history",subject,date);

fetch(url)
.then(r=>r.json())
.then(data=>{

let table=
document.getElementById("historyTable");

if(!table) return;

table.innerHTML=`
<tr>
<th>Date</th>
<th>Subject</th>
<th>Class</th>
<th>Name</th>
<th>Status</th>
<th>Edit</th>
</tr>
`;

data.forEach(a=>{

// student should see only his data
if (role === "student") {

if (
a.name.toLowerCase().trim()
!== username.toLowerCase().trim()
) return;

}

table.innerHTML+=`
<tr>

<td>${a.date}</td>
<td>${a.subject}</td>
<td>${a.classId}</td>
<td>${a.name}</td>
<td>${a.status}</td>

<td>

<button
onclick="editAttendance(
'${a.date}',
'${a.subject}',
${a.classId},
${a.student_id},
'${a.status}'
)">
Edit
</button>

</td>

</tr>
`;

});

});

}


// ---------- EDIT ----------

function editAttendance(
date,
subject,
classId,
student,
oldStatus
){

if (role !== "teacher") {

alert("Only teacher can edit");
return;

}

let newStatus =
oldStatus === "Present"
? "Absent"
: "Present";

fetch("/editAttendance",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

date:date,
subject:subject,
classId:classId,
student:student,
status:newStatus

})

})
.then(()=>reloadAll());

}


// ---------- CHART ----------

function loadChart(){

let subject=getSubject();
let date=getDate();

let url=
buildUrl("/summaryChart",subject,date);

fetch(url)
.then(r=>r.json())
.then(data=>{

let labels=[];
let values=[];


// ---------- TEACHER ----------

if(role === "teacher"){

for(let s in data){

let p=data[s].present||0;
let t=data[s].total||0;

let percent=0;

if(t>0)
percent=(p/t)*100;

labels.push(s);
values.push(percent);

}

drawChart(labels,values);
return;

}


// ---------- STUDENT ----------

fetch("/history")
.then(r=>r.json())
.then(hist=>{

let subjectMap={};

hist.forEach(h=>{

if(
h.name.toLowerCase().trim()
!== username.toLowerCase().trim()
) return;


// filter subject
if(subject && subject!="" && h.subject!==subject)
return;


// filter date
if(date && h.date!==date)
return;


if(!subjectMap[h.subject]){

subjectMap[h.subject]={
p:0,
t:0
};

}

subjectMap[h.subject].t++;

if(h.status==="Present")
subjectMap[h.subject].p++;

});


for(let s in subjectMap){

let p=subjectMap[s].p;
let t=subjectMap[s].t;

let percent=0;

if(t>0)
percent=(p/t)*100;

labels.push(s);
values.push(percent);

}

drawChart(labels,values);

});

});


function drawChart(labels,values){

let ctx=
document.getElementById("summaryChart");

if(!ctx) return;

if(window.chart)
window.chart.destroy();

window.chart=
new Chart(ctx,{

type:"bar",

data:{
labels:labels,
datasets:[{
label:"Attendance %",
data:values,
backgroundColor:[
"red",
"orange",
"green",
"blue"
]
}]
},

options:{
scales:{
y:{
beginAtZero:true,
max:100
}
}
}

});

}

}


// ---------- TOGGLE ----------

function toggleButtons(){

let subject=getSubject();

let disable=
subject==="";

for(let id in marked){

let p=document.getElementById("p"+id);
let a=document.getElementById("a"+id);

if(!p||!a) continue;

p.disabled=disable;
a.disabled=disable;

}

}


// ---------- RELOAD ----------

function reloadAll(){

loadStudents();

setTimeout(()=>{
loadReport();
loadStudentReport();
loadHistory();
loadChart();
toggleButtons();
},100);

}


// ---------- ADD ----------

function addStudent() {

let name =
document.getElementById(
"newStudentName"
).value;

if (!name) {
alert("Enter name");
return;
}

fetch("/addStudent", {

method: "POST",

headers: {
"Content-Type":
"application/json"
},

body: JSON.stringify({
name: name
})

})
.then(() => {

alert("Student added");
reloadAll();

});

}
function logout(){

localStorage.removeItem("role");
localStorage.removeItem("username");

window.location = "login.html";

}

function loadStudentSummary(){

if(role !== "teacher") return;

fetch("/studentReport")
.then(r=>r.json())
.then(data=>{

let div =
document.getElementById("studentSummary");

if(!div) return;

div.innerHTML =
"<h3>Student Report</h3>";

for(let id in data){

let percent = data[id];

div.innerHTML +=

"<div>"
+
id +
" → "
+
percent +
"%"
+
"</div>";

}

});

}
