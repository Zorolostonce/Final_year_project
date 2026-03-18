const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));


// ---------------- GET STUDENTS ----------------

app.get("/students", (req, res) => {

    const data = fs.readFileSync("students.json");

    res.json(JSON.parse(data));

});


// ---------------- ADD STUDENT ----------------

app.post("/addStudent", (req, res) => {

    let students = JSON.parse(
        fs.readFileSync("students.json")
    );

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
        id: id,
        name: name
    });

    fs.writeFileSync(
        "students.json",
        JSON.stringify(students, null, 2)
    );

    res.send("Added");

});

// ---------------- SAVE ATTENDANCE ----------------

app.post("/attendance", (req, res) => {

    let attendance = JSON.parse(
        fs.readFileSync("attendance.json")
    );

    let students = JSON.parse(
        fs.readFileSync("students.json")
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

    let classId = 1;

    if (attendance.length > 0) {
        classId =
            attendance[attendance.length - 1].classId;
    }

    // current class same subject + date
    let currentClass = attendance.filter(
        a =>
            a.classId === classId &&
            a.subject === subject &&
            a.date === date
    );

    // new class if full
    if (currentClass.length === studentCount) {

        classId++;

        currentClass = [];
    }

    // prevent duplicate
    let already = currentClass.find(
        a =>
            a.student_id === student_id &&
            a.subject === subject &&
            a.date === date
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
        "attendance.json",
        JSON.stringify(attendance, null, 2)
    );

    res.send("Saved");

});


// ---------------- REPORT ----------------

app.get("/report", (req, res) => {

    let subject = req.query.subject;
    let date = req.query.date;

    let attendance = JSON.parse(
        fs.readFileSync("attendance.json")
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


// ---------------- STUDENT REPORT ----------------

app.get("/studentReport", (req, res) => {

    let subject = req.query.subject;
    let date = req.query.date;

    let attendance = JSON.parse(
        fs.readFileSync("attendance.json")
    );

    let students = JSON.parse(
        fs.readFileSync("students.json")
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

app.get("/history", (req, res) => {

    let subject = req.query.subject;
    let date = req.query.date;

    let attendance = JSON.parse(
        fs.readFileSync("attendance.json")
    );

    let students = JSON.parse(
        fs.readFileSync("students.json")
    );

    let result = [];

    attendance.forEach(a => {

        if (!a) return;

        // subject filter
        if (subject && subject !== "") {
            if (a.subject !== subject) return;
        }

        // date filter
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

app.post("/editAttendance", (req, res) => {

    let attendance = JSON.parse(
        fs.readFileSync("attendance.json")
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
        "attendance.json",
        JSON.stringify(attendance, null, 2)
    );

    res.send("Updated");

});

app.get("/summaryChart", (req, res) => {

    let subject = req.query.subject;
    let date = req.query.date;

    let attendance = JSON.parse(
        fs.readFileSync("attendance.json")
    );

    let result = {};

    attendance.forEach(a => {

        if (!a) return;

        // ❌ ignore empty subject
        if (!a.subject) return;

        // subject filter
        if (subject && subject !== "") {
            if (a.subject !== subject) return;
        }

        // date filter
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
app.post("/deleteAttendance", (req, res) => {

    let {
        date,
        subject,
        classId,
        student
    } = req.body;

    let attendance =
        JSON.parse(
            fs.readFileSync("attendance.json")
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
        "attendance.json",
        JSON.stringify(attendance, null, 2)
    );

    res.send("Deleted");

});

// ---------------- START SERVER ----------------

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log("Server running on port", PORT);

});
