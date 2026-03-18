window.onload = function () {

    let today =
    new Date().toISOString().slice(0,10);

    document.getElementById("date").value =
    today;

    loadReport();
    loadStudentReport();
    loadHistory();
    loadChart();
};

let marked = {};
let studentTotal = 0;


// ---------- LOAD STUDENTS ----------

let role =
localStorage.getItem("role");

let username =
localStorage.getItem("username");

fetch("/students")
.then(res => res.json())
.then(data => {

    // if student → show only himself

if (role === "student") {

    data = data.filter(
        s =>
        s.name.trim().toLowerCase()
        ===
        username.trim().toLowerCase()
    );

}

    studentTotal = data.length;

    let div =
    document.getElementById(
        "studentsTable"
    );

    data.forEach(s => {

        marked[s.id] = false;

        div.innerHTML += `

        <tr>

        <td>${s.name}</td>

        <td>
        <button
        id="p${s.id}"
        onclick="mark(${s.id},'Present')">
        P
        </button>
        </td>

        <td>
        <button
        id="a${s.id}"
        onclick="mark(${s.id},'Absent')">
        A
        </button>
        </td>

        <td>
        <span id="percent${s.id}">
        </span>
        </td>

        </tr>

        `;
    });
});

// ---------- MARK ----------

function mark(id,status){
    let role =
localStorage.getItem("role");

if (role !== "teacher") {

    alert("Only teacher can mark");

    return;

}
    if(marked[id]) return;

    marked[id] = true;

    document.getElementById("p"+id).disabled=true;
    document.getElementById("a"+id).disabled=true;

    let subject =
    document.getElementById("subject").value;

    let date =
    document.getElementById("date").value;

    fetch("/attendance",{

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


// ---------- ROUND COMPLETE ----------

function checkRoundComplete(){

    let count=0;

    for(let id in marked){

        if(marked[id]) count++;

    }

    if(count===studentTotal){

        for(let id in marked){

            marked[id]=false;

            document.getElementById("p"+id).disabled=false;
            document.getElementById("a"+id).disabled=false;

        }

        reloadAll();
    }

}


// ---------- URL BUILDER ----------

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

    fetch(url)
    .then(r=>r.json())
    .then(data=>{

        document.getElementById("totalClass").innerText=data.totalClasses;
        document.getElementById("presentCount").innerText=data.present;
        document.getElementById("absentCount").innerText=data.absent;

        let percent=0;

        if(data.totalClasses>0){

            if(subject===""){

                percent=
                data.present/
                (data.present+data.absent||1)
                *100;

            }

            else{

                percent=
                data.present/
                (data.totalClasses*studentTotal)
                *100;

            }

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

    fetch(url1)
    .then(r=>r.json())
    .then(rep=>{

        fetch(url2)
        .then(r=>r.json())
        .then(data=>{

            let totalClasses=
            rep.totalClasses;

            for(let id in data){

                let present=data[id];

                let percent=0;

                if(totalClasses>0){

                    if(subject===""){

                        percent=
                        present/
                        totalClasses
                        *100/studentTotal;

                    }

                    else{

                        percent=
                        present/
                        totalClasses
                        *100;

                    }

                }

                if(percent>100) percent=100;

                let el=
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

                el.innerHTML=
                `
                <div class="bar">
                <div class="fill"
                style="width:${percent}%;
                background:${color}">
                </div>
                </div>

                ${percent.toFixed(0)}%

                <span class="warn">
                ${warn}
                </span>
                `;
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

    fetch(url)
    .then(r=>r.json())
    .then(data=>{

        let table=
        document.getElementById("historyTable");

        table.innerHTML=
        `
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

            table.innerHTML+=
            `
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
date,subject,classId,student,oldStatus){

    let newStatus=
    oldStatus==="Present"
    ?"Absent":"Present";

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

    let subject=
    document.getElementById("subject").value;

    let date=
    document.getElementById("date").value;

    let url=
    buildUrl("/summaryChart",subject,date);

    fetch(url)
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

            if(percent>100)
                percent=100;

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

    });

}


// ---------- TOGGLE ----------

function toggleButtons(){

    let subject=
    document.getElementById("subject").value;

    let disable=
    subject==="";

    for(let id in marked){

        let p=
        document.getElementById("p"+id);

        let a=
        document.getElementById("a"+id);

        if(!p||!a) continue;

        p.disabled=disable;
        a.disabled=disable;

    }

}



// ---------- RELOAD ----------

function reloadAll(){

    loadReport();
    loadStudentReport();
    loadHistory();
    loadChart();
    toggleButtons();

}
function addStudent() {

    let name =
    document.getElementById(
        "newStudentName"
    ).value;

    console.log("Clicked", name);

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
    .then(r => r.text())
    .then(t => {

        console.log("Server:", t);

        alert("Student added");

        location.reload();

    });

}
