const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));


// helper
function readJSON(file) {
    return JSON.parse(
        fs.readFileSync(__dirname + "/" + file)
    );
}

function writeJSON(file, data) {
    fs.writeFileSync(
        __dirname + "/" + file,
        JSON.stringify(data, null, 2)
    );
}


// ---------------- GET STUDENTS ----------------

app.get("/students", (req, res) => {

    res.json(
        readJSON("students.json")
    );

});


// ---------------- ADD STUDENT ----------------

app.post("/addStudent", (req, res) => {

    let students =
        readJSON("students.json");

    let name = req.body.name;

    if (!name) {
        return res.send("No name");
    }

    let id = 1;

    if (students.length > 0) {
        id =
            students[students.length - 1].id + 1;
    }

    students.push({
        id,
        name
    });

    writeJSON(
        "students.json",
        students
    );

    res.send("Added");

});


// ---------------- SAVE ATTENDANCE ----------------

app.post("/attendance", (req, res) => {

    let attendance =
        readJSON("attendance.json");

    let students =
        readJSON("students.json");

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

    let classId = 1;

    if (attendance.length > 0) {
        classId =
            attendance[attendance.length - 1].classId;
    }

    let currentClass = attendance.filter(
        a =>
            a.classId === classId &&
            a.subject === subject &&
            a.date === date
    );

    if (currentClass.length === studentCount) {

        classId++;
        currentClass = [];

    }

    let already = currentClass.find(
        a =>
            a.student_id === student_id &&
            a.subject === subject &&
            a.date === date
    );

    if (already) {
        return res.send("Already marked");
    }

    attendance.push({
        classId,
        student_id,
        status,
        subject,
        date
    });

    writeJSON(
        "attendance.json",
        attendance
    );

    res.send("Saved");

});


// ---------------- REPORT ----------------

app.get("/report", (req, res) => {

    let subject = req.query.subject;
    let date = req.query.date;

    let attendance =
        readJSON("attendance.json");

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

    res.json({
        totalClasses: classSet.size,
        present,
        absent
    });

});


// ---------------- STUDENT REPORT ----------------

app.get("/studentReport", (req, res) => {

    let subject = req.query.subject;
    let date = req.query.date;

    let attendance =
        readJSON("attendance.json");

    let students =
        readJSON("students.json");

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

    let attendance =
        readJSON("attendance.json");

    let students =
        readJSON("students.json");

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

    let attendance =
        readJSON("attendance.json");

    let {
        date,
        subject,
        classId,
        student,
        status
    } = req.body;

    attendance.forEach(a => {

        if (
            a.date === date &&
            a.subject === subject &&
            a.classId == classId &&
            a.student_id == student
        ) {
            a.status = status;
        }

    });

    writeJSON(
        "attendance.json",
        attendance
    );

    res.send("Updated");

});


// ---------------- CHART ----------------

app.get("/summaryChart", (req, res) => {

    let subject = req.query.subject;
    let date = req.query.date;

    let attendance =
        readJSON("attendance.json");

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
        readJSON("attendance.json");

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

    writeJSON(
        "attendance.json",
        attendance
    );

    res.send("Deleted");

});


// ---------------- LOGIN ----------------

app.post("/login", (req, res) => {

    let users =
        readJSON("users.json");

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


// ---------------- START ----------------

const PORT =
process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(
        "Server running on",
        PORT
    );

});
