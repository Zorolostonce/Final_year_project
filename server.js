const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

const studentsFile = __dirname + "/students.json";
const attendanceFile = __dirname + "/attendance.json";
const usersFile = __dirname + "/users.json";


// ---------------- GET STUDENTS ----------------

app.get("/students", (req, res) => {

    const data = fs.readFileSync(studentsFile);

    res.json(JSON.parse(data));

});


// ---------------- ADD STUDENT ----------------

app.post("/addStudent", (req, res) => {

    let students = JSON.parse(
        fs.readFileSync(studentsFile)
    );

    let users = JSON.parse(
        fs.readFileSync("users.json")
    );

    let name = req.body.name;

    if (!name) {
        return res.send("No name");
    }

    name = name.trim();

    // ✅ check duplicate student
    let existsStudent = students.find(
        s =>
        s.name.toLowerCase().trim()
        ===
        name.toLowerCase().trim()
    );

    if (existsStudent) {
        return res.send("Student already exists");
    }

    // ✅ check duplicate user
    let existsUser = users.find(
        u =>
        u.username.toLowerCase().trim()
        ===
        name.toLowerCase().trim()
    );

    if (existsUser) {
        return res.send("User already exists");
    }

    let id = 1;

    if (students.length > 0) {
        id =
        students[students.length - 1].id + 1;
    }

    // add student
    students.push({
        id: id,
        name: name
    });

    // add user login
    users.push({
        username: name,
        password: "123",
        role: "student"
    });

    fs.writeFileSync(
        "users.json",
        JSON.stringify(users, null, 2)
    );

    fs.writeFileSync(
        studentsFile,
        JSON.stringify(students, null, 2)
    );

    res.send("Added");

});


// ---------------- SAVE ATTENDANCE ----------------

app.post("/attendance", (req, res) => {

    let attendance = JSON.parse(
        fs.readFileSync(attendanceFile)
    );

    let students = JSON.parse(
        fs.readFileSync(studentsFile)
    );

    let studentCount = students.length;

    let {
        student_id,
        status,
        subject,
        date
    } = req.body;

    if (!date) {
        date =
            new Date()
                .toISOString()
                .slice(0, 10);
    }

    // ✅ get last classId only for same date + subject
    let classId = 1;

    if (attendance.length > 0) {

        let last = attendance
            .slice()
            .reverse()
            .find(
                a =>
                    a.date === date &&
                    a.subject === subject
            );

        if (last) {
            classId = last.classId;
        } else {

            // new day / subject → new class
            classId =
                attendance[
                    attendance.length - 1
                ].classId + 1;
        }
    }

    let currentClass = attendance.filter(
        a =>
            a.classId === classId &&
            a.subject === subject &&
            a.date === date
    );

    // if class full → next class
    if (currentClass.length === studentCount) {

        classId++;

        currentClass = [];
    }

    let already = currentClass.find(
        a =>
            a.student_id === student_id &&
            a.subject === subject &&
            a.date === date &&
            a.classId === classId
    );

    if (already) {
        return res.send("Already marked");
    }

    let record = {
        classId,
        student_id,
        status,
        subject,
        date
    };

    attendance.push(record);

    fs.writeFileSync(
        attendanceFile,
        JSON.stringify(attendance, null, 2)
    );

    res.send("Saved");

});

// ---------------- REPORT ----------------

app.get("/report", (req, res) => {

    let subject = req.query.subject;
    let date = req.query.date;

    let attendance = JSON.parse(
        fs.readFileSync(attendanceFile)
    );

    let present = 0;
    let absent = 0;

    let classSet = new Set();

    attendance.forEach(a => {

        if (!a) return;

        if (subject && a.subject !== subject)
            return;

        if (date && a.date !== date)
            return;

        classSet.add(a.classId);

        if (a.status === "Present")
            present++;
        else
            absent++;

    });

    let totalClasses = classSet.size;

    res.json({
        totalClasses,
        present,
        absent
    });

});

//---------------Attendance Report-------------------

app.get("/reportRange", (req,res)=>{

let attendance =
JSON.parse(
fs.readFileSync("attendance.json")
);

let subject = req.query.subject || "";
let date = req.query.date;
let type = req.query.type || "day";

let selected = new Date(date);

let present = 0;
let absent = 0;

let classSet = new Set();


attendance.forEach(a=>{

let d = new Date(a.date);


// ---------- DAY ----------

// ---------- DAY ----------

if(type==="day"){

let d1 = new Date(a.date);
let d2 = new Date(date);

if(
d1.getFullYear() !== d2.getFullYear() ||
d1.getMonth() !== d2.getMonth() ||
d1.getDate() !== d2.getDate()
){
return;
}

}


// ---------- WEEK ----------

if(type==="week"){

let w1 = new Date(selected);
let w2 = new Date(selected);

w1.setDate(selected.getDate() - selected.getDay()); // start week
w2.setDate(w1.getDate() + 6); // end week

if(d < w1 || d > w2) return;

}


// ---------- MONTH ----------

if(type==="month"){

if(
d.getMonth() !== selected.getMonth()
||
d.getFullYear() !== selected.getFullYear()
) return;

}


// ---------- YEAR ----------

if(type==="year"){

if(
d.getFullYear()
!== selected.getFullYear()
) return;

}


// ---------- SUBJECT ----------

if(subject && subject!==""){

if(a.subject !== subject) return;

}


// ---------- COUNT ----------

if(a.status==="Present") present++;
else absent++;

classSet.add(
a.date + "_" +
a.subject + "_" +
a.classId
);

});


res.json({

totalClasses: classSet.size,
present: present,
absent: absent

});

});
// ---------------- STUDENT REPORT ----------------

app.get("/studentReport", (req, res) => {

    let subject = req.query.subject;
    let date = req.query.date;

    let attendance = JSON.parse(
        fs.readFileSync(attendanceFile)
    );

    let students = JSON.parse(
        fs.readFileSync(studentsFile)
    );

    let result = {};

    students.forEach(s => {
        result[s.id] = 0;
    });

    attendance.forEach(a => {

        if (!a) return;

        if (subject && a.subject !== subject)
            return;

        if (date && a.date !== date)
            return;

        if (a.status === "Present") {
            result[a.student_id]++;
        }

    });

    res.json(result);

});


// ---------------- HISTORY ----------------

app.get("/history", (req, res) => {

    let subject = req.query.subject;
    let date = req.query.date;

    let attendance = JSON.parse(
        fs.readFileSync(attendanceFile)
    );

    let students = JSON.parse(
        fs.readFileSync(studentsFile)
    );

    let result = [];

    attendance.forEach(a => {

        if (!a) return;

        if (subject && subject !== "") {
            if (a.subject !== subject) return;
        }

        if (date) {
            if (a.date !== date) return;
        }

        let student =
            students.find(
                s => s.id == a.student_id
            );

        result.push({

            date: a.date,
            subject: a.subject,
            classId: a.classId,
            name: student ? student.name : "",
            status: a.status,
            student_id: a.student_id

        });

    });

    res.json(result);

});


// ---------------- EDIT ----------------

app.post("/editAttendance", (req, res) => {

    let attendance = JSON.parse(
        fs.readFileSync(attendanceFile)
    );

    let {
        date,
        subject,
        classId,
        student,
        status
    } = req.body;

    for (let i = 0; i < attendance.length; i++) {

        let a = attendance[i];

        if (
            a.date === date &&
            a.subject === subject &&
            a.classId == classId &&
            a.student_id == student
        ) {
            a.status = status;
        }
    }

    fs.writeFileSync(
        attendanceFile,
        JSON.stringify(attendance, null, 2)
    );

    res.send("Updated");

});


// ---------------- CHART ----------------

app.get("/summaryChart", (req, res) => {

    let subject = req.query.subject;
    let date = req.query.date;

    let attendance = JSON.parse(
        fs.readFileSync(attendanceFile)
    );

    let result = {};

    attendance.forEach(a => {

        if (!a) return;

        if (!a.subject) return;

        if (subject && subject !== "") {
            if (a.subject !== subject) return;
        }

        if (date) {
            if (a.date !== date) return;
        }

        if (!result[a.subject]) {
            result[a.subject] = {
                present: 0,
                total: 0
            };
        }

        result[a.subject].total++;

        if (a.status === "Present") {
            result[a.subject].present++;
        }

    });

    res.json(result);

});


// ---------------- DELETE ----------------

app.post("/deleteAttendance", (req, res) => {

    let {
        date,
        subject,
        classId,
        student
    } = req.body;

    let attendance =
        JSON.parse(
            fs.readFileSync(attendanceFile)
        );

    attendance =
        attendance.filter(a => {

            if (!a) return false;

            return !(
                a.date === date &&
                a.subject === subject &&
                a.classId === classId &&
                a.student_id === student
            );

        });

    fs.writeFileSync(
        attendanceFile,
        JSON.stringify(attendance, null, 2)
    );

    res.send("Deleted");

});


// ---------------- LOGIN ----------------

app.post("/login", (req, res) => {

    let users = JSON.parse(
        fs.readFileSync(usersFile)
    );

    let { username, password } = req.body;

    let user = users.find(
        u =>
            u.username === username &&
            u.password === password
    );

    if (!user) {

        return res.json({
            success: false
        });

    }

    res.json({
        success: true,
        role: user.role
    });

});



// ---------------- START SERVER ----------------

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log("Server running on port", PORT);

});
