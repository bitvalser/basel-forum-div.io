const config = {
    apiKey: "AIzaSyCC5CwJYW2GohaBxBM_iaG8L74tHFpSi6M",
    authDomain: "forum-57321.firebaseapp.com",
    databaseURL: "https://forum-57321.firebaseio.com",
    projectId: "forum-57321",
    storageBucket: "forum-57321.appspot.com",
    messagingSenderId: "78283561107"
};
firebase.initializeApp(config);

const auth = firebase.auth();
const db = firebase.database().ref().child('forums');
const users = firebase.database().ref().child('users');
let user = null;
let isLogin = false;
const isLoadState = new Promise((resolve, reject) => {
    firebase.auth().onAuthStateChanged((firebaseUser) => {
        console.log(firebaseUser);
        if (firebaseUser) {
            isLogin = true;
            users.child(firebaseUser.uid).on('value', (e) => {
                if (e.val()) {
                    user = {
                        ...e.val(),
                        uid: firebaseUser.uid
                    };
                    document.getElementById('profile').innerHTML = `
                    <h2 class="email">${user.nick}</h2>
                    <button class="logOut" onclick="logOut()">Выход</button>`;
                }
            });
            resolve(isLogin);
        } else {
            document.getElementById('profile').innerHTML = '';
            document.getElementById('message_sender').innerHTML = '';
            reject(false);
        }
    });
});

const forumId = getParameterByName('forumId');
const forum = document.getElementById('forums');

if (forum) {
    db.on('value', (e) => {
    let keysArray = [];
        if (e.val()) {
            keysArray = Object.keys(e.val());
        }
        let forums = '';
        keysArray.forEach(key => {
            forums += `
            <li class="menu-item">
                <a href="forum.html?forumId=${key}">${e.val()[key].name}</a>
                <div class="forum-author">${e.val()[key].author}</div>
            </li>`;
        })
        forums += `
        <li class="menu-item-add" onclick="addForum()">
            + Добавить форум
        </li>`;
        document.getElementById('forums').innerHTML = forums;
    });
}

const forumMessages = {};

if (forumId) {
    db.child(forumId).on('value', (e) => {
        if (e.val()) {
            document.getElementById('forum_name').innerHTML = e.val().name;
            if(e.val().messages) {
                const keyArray = Object.keys(e.val().messages);
                let messagesHtml = '';
                keyArray.forEach(key => {
                    if(e.val().messages[key].likes) {
                        forumMessages[key] = {
                            likes: Object.keys(e.val().messages[key].likes)
                        };
                    } else {
                        forumMessages[key] = {};
                        forumMessages[key].likes = [];
                    }
                    messagesHtml += `
                    <div class="message">
                        <div class="message-author">${e.val().messages[key].author}</div>
                        <div class="message-date">${e.val().messages[key].date}</div>
                        <div class="message-body">${e.val().messages[key].body}</div>
                        <div class="message-like" onclick="like('${key}')">${forumMessages[key].likes.length} Like</div>
                    </div>`;
                });
                document.getElementById('messages').innerHTML = messagesHtml;

            }
        }
    });
    isLoadState.then(isLogin => {
        if (isLogin) {
            document.getElementById('message_sender').innerHTML = `  
            <textarea id="message_body"></textarea>
            <button onclick="sendMessage()">Отправить</button>`;
        }
    });
}

function like(id) {
    let likes = {};
    if (forumMessages[id].likes.find(key => key === user.uid) === undefined) {
        forumMessages[id].likes.forEach(key => {
            likes[key] = true;
        });
        likes[user.uid] = true;
    } else {
        forumMessages[id].likes.forEach(key => {
            if (key !== user.uid) {
                likes[key] = true;
            }
        });
    }
    db.child(forumId).child('messages').child(id).child('likes').set(likes);
}

function sendMessage() {
    let message_body = document.getElementById('message_body');
    db.child(forumId).child('messages').push({
        author: user.nick,
        body: message_body.value, 
        date: `${new Date().toLocaleDateString()} ${new Date().toTimeString().substr(0, 5)}`,
        likes: []
    });
    document.getElementById('message_body').value = '';
}

function addForum() {
    let name = prompt('Введите название темы');
    db.push({
        name,
        author: user.nick
    });
}

function login() {
    let login_input = document.getElementById('login_input');
    let password_input = document.getElementById('password_input');
    auth.signInWithEmailAndPassword(login_input.value, password_input.value)
    .then()
    .catch(error => {
        alert(error.message);
    });
}

function register() {
    let nick_input = document.getElementById('nick_input');
    let login_input = document.getElementById('login_input');
    let password_input = document.getElementById('password_input');
    let rpassword_input = document.getElementById('rpassword_input');
    if(password_input.value === rpassword_input.value) {
        auth.createUserWithEmailAndPassword(login_input.value, password_input.value)
        .then(res => {
            users.child(res.user.uid).set({
                email: res.user.email,
                nick: nick_input.value,
                role: 'Пользователь'
            });
        })
        .catch(error => {
            alert(error.message);
        });
    } else {
        alert('Пароли не совпадают');
    }
}

function logOut() {
    auth.signOut();
}

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}