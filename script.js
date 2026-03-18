window.onload = function () {

    let today =
    new Date().toISOString().slice(0,10);

    document.getElementById("date").value =
    today;

    loadStudents();
    loadReport();
    loadStudentReport();
    loadHistory();
    loadChart();
};

let marked = {};
let studentTotal = 0;

// default teacher if no login
let role =
localStorage.getItem("role") || "teacher";

let username =
localStorage.getItem("username") || "";



// ---------- LOAD STUDENTS ----------

function loadStudents() {

fetch(window.location.origin + "/students")
.then(res => res.json())
.then(data => {

    let div =
    document.getElementById("studentsTable");

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

        // student → only his row
        if (role === "student") {

            if (!username) return;

            if (
                s.name.toLowerCase().trim()
                !==
                username.toLowerCase().trim()
            ) {
                return;
            }

        }

        studentTotal++;

        marked[s.id] = false;

        div.innerHTML += `

        <tr id="row${s.id}">

        <td>${s.name}</td>

        <td>
        <button id="p${s.id}"
        onclick="mark(${s.id},'Present')">
        P
        </button>
        </td>

        <td>
        <button id="a${s.id}"
        onclick="mark(${s.id},'Absent')">
        A
        </button>
        </td>

        <td>
        <span id="percent${s.id}"></span>
        </td>

        </tr>

        `;
    });

    toggleButtons();

});

}



// ---------- MARK ----------

function mark(id,status){

if (role !== "teacher") {

alert("Only teacher can mark");
return;

}

if(marked[id]) return;

marked[id] = true;

let p=document.getElementById("p"+id);
let a=document.getElementById("a"+id);

if(p) p.disabled=true;
if(a) a.disabled=true;

let subject =
document.getElementById("subject").value;

let date =
document.getElementById("date").value;

fetch(window.location.origin + "/attendance",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

student_id:id,
status:status,
subject:subject,
date:date

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

let p=document.getElementById("p"+id);
let a=document.getElementById("a"+id);

if(p) p.disabled=false;
if(a) a.disabled=false;

}

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

let subject=
document.getElementById("subject").value;

let date=
document.getElementById("date").value;

let url=
buildUrl("/report",subject,date);

fetch(window.location.origin +url)
.then(r=>r.json())
.then(data=>{

document.getElementById("totalClass").innerText=data.totalClasses;
document.getElementById("presentCount").innerText=data.present;
document.getElementById("absentCount").innerText=data.absent;

let percent=0;

if(data.totalClasses>0){

percent=
data.present/
(data.present+data.absent||1)
*100;

}

if(percent>100) percent=100;

document.getElementById("percent").innerText=
percent.toFixed(0);

});

}



// ---------- STUDENT REPORT ----------

function loadStudentReport(){

let subject=
document.getElementById("subject").value;

let date=
document.getElementById("date").value;

let url1=
buildUrl("/report",subject,date);

let url2=
buildUrl("/studentReport",subject,date);

fetch(window.location.origin +url1)
.then(r=>r.json())
.then(rep=>{

fetch(window.location.origin +url2)
.then(r=>r.json())
.then(data=>{

let totalClasses=
rep.totalClasses;

for(let id in data){

let present=data[id];

let percent=0;

if(totalClasses>0){

percent=
present/
totalClasses
*100;

}

let el=
document.getElementById("percent"+id);

if(!el) continue;

el.innerText=
percent.toFixed(0)+"%";

}

});

});

}



// ---------- HISTORY ----------

function loadHistory(){

let subject=
document.getElementById("subject").value;

let date=
document.getElementById("date").value;

let url=
buildUrl("/history",subject,date);

fetch(window.location.origin +url)
.then(r=>r.json())
.then(data=>{

let table=
document.getElementById("historyTable");

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

fetch(window.location.origin +"/editAttendance",{

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

let subject=
document.getElementById("subject").value;

let date=
document.getElementById("date").value;

let url=
buildUrl("/summaryChart",subject,date);

fetch(window.location.origin +url)
.then(r=>r.json())
.then(data=>{

let labels=[];
let values=[];

for(let s in data){

let p=data[s].present||0;
let t=data[s].total||0;

let percent=0;

if(t>0)
percent=(p/t)*100;

labels.push(s);
values.push(percent);

}

let ctx=
document.getElementById("summaryChart");

if(window.chart)
window.chart.destroy();

window.chart=
new Chart(ctx,{

type:"bar",

data:{
labels:labels,
datasets:[{
label:"Attendance %",
data:values
}]
}

});

});

}



// ---------- TOGGLE ----------

function toggleButtons(){

let subject=
document.getElementById("subject").value;

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
loadReport();
loadStudentReport();
loadHistory();
loadChart();
toggleButtons();

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

fetch(window.location.origin +"/addStudent", {

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
