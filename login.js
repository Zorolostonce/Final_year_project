function login() {

    let username =
        document.getElementById("username").value;

    let password =
        document.getElementById("password").value;

    fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username,
            password
        })
    })
    .then(r => r.json())
    .then(data => {

        if (!data.success) {

            alert("Wrong login");

            return;

        }

        localStorage.setItem(
            "role",
            data.role
        );

        if (data.role === "teacher") {

            window.location =
            "index.html";

        } else {

            window.location =
            "history.html";

        }

    });

}
