// INIT APP

const config = {
    apiKey: "AIzaSyCC5CwJYW2GohaBxBM_iaG8L74tHFpSi6M",
    authDomain: "forum-57321.firebaseapp.com",
    databaseURL: "https://forum-57321.firebaseio.com",
    projectId: "forum-57321",
    storageBucket: "forum-57321.appspot.com",
    messagingSenderId: "78283561107"
};
firebase.initializeApp(config);

let user = null;
const db = firebase.database().ref().child('forums');
const users = firebase.database().ref().child('users');
const storage = firebase.storage().ref();
const auth = firebase.auth();
let usersData = {};

const isLoadState = new Promise((resolve, reject) => {
    firebase.auth().onAuthStateChanged((firebaseUser) => {
        console.log(firebaseUser);
        if (firebaseUser) {
            users.child(firebaseUser.uid).on('value', (e) => {
                if (e.val()) {
                    initUserProfile(e.val(), firebaseUser.uid);
                    resolve(e.val());
                }
                reject(false);
            });
        } else {
            if(document.getElementById('profile')) {
                document.getElementById('profile').innerHTML = '';
            }
            if (document.getElementById('message_sender')) {
                document.getElementById('message_sender').innerHTML = '';
            }
            if (document.getElementById('menu-item-add')) {
                document.getElementById('menu-item-add').remove();
            }
            resolve(false);
        }
    });
});

isLoadState.then(() => {
    switch(document.getElementById('page').getAttribute('page')) {
        case 'Dashboard':
            initDashboard()
            break;
        case 'Profile':
            initProfile();
            break;
        case 'Forum':
            initForum();
            break;
        case 'Users':
            initUsers();
            break;
    }
})


// MODULES -> DASHBOARD, FORUM, PROFILE, AUTHORIZATION, COMMON FUNCTIONS, USERS

// DASHBOARD
function initDashboard() {
    stopLoadingSpinner();
    db.on('value', (e) => {
        let keysArray = [];
        if (e.val()) {
            keysArray = Object.keys(e.val());
        }
        let forums = '';
        if(user) {
            forums += `
            <li class="menu-item-add" id="menu-item-add" onclick="addForum()">
                Создать тему..
            </li>`;
        }
        keysArray.forEach(key => {
            forums += `
            <li class="menu-item">
                <a href="./pages/Forum/Forum.html?forumId=${key}">${e.val()[key].name}</a>
                ${user && (e.val()[key].authorUid === user.uid || (user.role === 'Администратор' && user.role !== 'Основатель') || user.role === 'Основатель')
                ? `<div class="forum-delete" onclick="deleteForum('${key}', '${e.val()[key].name}')"><img class="trash_logo" src="./img/trash.png" style="width: 23px; height: 23px; margin-top: 13px;"></div>` : ''}
                <div class="forum-author">${e.val()[key].author}</div>
                <div class="sozd">Создатель:</div>
            </li>`;
        })
        document.getElementById('forums').innerHTML = forums;
    });
}

function addForum() {
    let name = prompt('Введите название темы');
    if (name) {
        db.push({
            name,
            author: user.nick,
            authorUid: user.uid
        });
    }
}

function deleteForum(key, name) {
    if (confirm(`Вы действительно хотите удалить тему ${name}?`)) {
        db.child(key).remove();
    }
}
//===============

// FORUM
const forumId = getParameterByName('forumId');
const forumMessages = {};
const allowedTags = ['img', 'b', 'i', 's', 'sup', 'sub', 'h2', 'h3', 'h4', 'h5', 'h6'];

function initForum() {
    const isLoadingState = initUsersData();
    isLoadingState.then(() => {
        stopLoadingSpinner();
        db.child(forumId).on('value', (e) => {
            if (e.val()) {
                document.getElementById('forum_name').innerHTML = e.val().name;
                if (e.val().messages) {
                    const keyArray = Object.keys(e.val().messages);
                    let messagesHtml = '';
                    keyArray.forEach((key, index) => {
                        if (e.val().messages[key].likes) {
                            forumMessages[key] = {
                                likes: Object.keys(e.val().messages[key].likes)
                            };
                        } else {
                            forumMessages[key] = {};
                            forumMessages[key].likes = [];
                        }
                        let userData = usersData[e.val().messages[key].authorUid];
                        messagesHtml += `
                        <div class="message-avatar" style="margin-top: ${index === 0 ? 10 : 5}px">
                            <img src="${userData.avatar ? userData.avatar : '../../img/avatar-no-photo.png'}">
                            <div class="role" style="${getUserRoleStyle(userData.role)}">${userData.role}</div>
                        </div>
                        <div class="message">
                            <a href="../Profile/Profile.html?userUid=${e.val().messages[key].authorUid}">
                                <div class="message-author" >${e.val().messages[key].author}</div>
                            </a>
                            <div class="message-date">${e.val().messages[key].date}</div>
                            <div class="message-body">${e.val().messages[key].body}</div>
                            <div style="margin-top: 20px;" class="message-like" onclick="like('${key}')">${forumMessages[key].likes.length} 
                                <img class="finger-img" src="../../img/finger.png" width="23" height="23"/>
                            </div>
                            ${user && (e.val().messages[key].authorUid === user.uid || (user.role === 'Администратор' && userData.role !== 'Основатель') || user.role === 'Основатель')
                            ? `<div class="message-delete" onclick="deleteMessage('${key}')"><img class="trash_logo" src="../../img/trash.png" style="width: 23px; height: 23px;"></div>` : ''}
                        </div>`;
                    });
                    document.getElementById('messages').innerHTML = messagesHtml;
    
                }
            }
        });
        if (user) {
            message_senderHmtl = '<div class="sender_formatter">'
            allowedTags.forEach(tag => {
                message_senderHmtl += `
            <div class="formtter_element" onclick="addTag('${tag}')">
                <${tag === 'img' ? 'img src="a"' : tag}>${tag !== 'img' ? tag : ''}</${tag}>
            </div>`;
            })
            message_senderHmtl += `
            <div class="formtter_element" onclick="toggleEmoji()">&#128515;</div>
            <div id="emojis">
            <hr>`;
            for(let i = 13; i <= 91; i++) {
                message_senderHmtl += `<div class="emoji" onclick="addEmoji('&#1285${i}')">&#1285${i}</div>`;
            }
            message_senderHmtl += `   </div>
            </div>
            <textarea id="message_body"></textarea><br>
            <button class="msgbutton" onclick="sendMessage()">Отправить</button>`;
            document.getElementById('message_sender').innerHTML = message_senderHmtl;
        }
    })
}

function addEmoji(emoji) {
    const input = document.getElementById('message_body');
    input.value = `${input.value.substr(0, input.selectionStart)}${emoji}${input.value.substr(input.selectionEnd)}`;
}

function toggleEmoji() {
    document.getElementById('emojis').style.display = document.getElementById('emojis').style.display === 'block' ? 'none' : 'block';
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

function deleteMessage(id) {
    if (confirm('Вы действительно хотите удалить это сообщение?')) {
        db.child(forumId).child('messages').child(id).remove();
    }
}

function addTag(tag) {
    const input = document.getElementById('message_body');
    // if(input.selectionStart !== input.selectionEnd)
    let = img_url = ''
    if (tag === 'img') {
        img_url = prompt("Вставьте url картинки");
    }
    input.value = `${input.value.substr(0, input.selectionStart)}[${tag === 'img' ? `img src="${img_url}"` : tag}]${input.value.substr(input.selectionStart, input.selectionEnd - input.selectionStart)}[/${tag}]${input.value.substr(input.selectionEnd)}`;
}

const TIMEOUT_RANGE = 1.5;
function sendMessage() {
    if (localStorage.getItem('MESSAGE_TIMEOUT') && user.role !== 'Администратор' && user.role !== 'Основатель') {
        if(new Date().getTime() < new Date(+localStorage.getItem('MESSAGE_TIMEOUT')).getTime()) {
            const time = (new Date(new Date(+localStorage.getItem('MESSAGE_TIMEOUT')).getTime() 
                        - new Date().getTime()).getTime() / 60000) * 60;
            alert(`Подождит перед отправкой следующего сообщения ${Math.floor(time / 60)}:${Math.floor(time % 60)}`);
            return;
        }
    }
    localStorage.setItem('MESSAGE_TIMEOUT', new Date().getTime() + TIMEOUT_RANGE * 60000);
    let message_body = parseMessage(document.getElementById('message_body').value);
    db.child(forumId).child('messages').push({
        authorUid: user.uid,
        author: user.nick,
        body: message_body,
        date: `${new Date().toLocaleDateString()} ${new Date().toTimeString().substr(0, 5)}`,
        likes: []
    });
    document.getElementById('message_body').value = '';
}

function parseMessage(body) {
    let parsedBody = body.replace(new RegExp('<.*?>(.*?)<\/.*?>', 'g'), `$1`);

    allowedTags.forEach(tag => {
        let reg = `\\[${tag}(.*?)](.*?)\\[/${tag}]`;
        if (tag === 'img') { 
            parsedBody = parsedBody.replace(new RegExp(reg, 'g'), `<${tag} $1 class="message-image">$2</${tag}>`);
        } else {
            parsedBody = parsedBody.replace(new RegExp(reg, 'g'), `<${tag} $1>$2</${tag}>`);
        }
    });
    return parsedBody;
}
// ===========

// PROFILE
const userUid = getParameterByName('userUid');

function initProfile() {
    const profileImg = document.getElementById('profile_img');
    const inputElement = document.getElementById('avatar');

    if (userUid === user.uid || user.role === 'Администратор' || user.role === 'Основатель') {
        inputElement.addEventListener('change', () => {
            let file = inputElement.files[0];
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = function () {
                storage.child('avatars').child(userUid).put(file).then(snapshot => {
                    storage.child('avatars').child(userUid).getDownloadURL().then(url => {
                        users.child(userUid).child('avatar').set(url)
                    });
                });
            };
        }, false);
    } else {
        inputElement.remove();
    }

    stopLoadingSpinner();
    users.child(userUid).on('value', e => {
        if (e.val()) {
            console.log(e.val());
            document.getElementById('profile_name').innerHTML = e.val().nick;
            profile_content.innerHTML = `<span>Почта: ${e.val().email}</span><br>`;
            if (userUid !== user.uid) {
                switch(user.role) {
                    case 'Администратор':
                        if (e.val().role === 'Администратор' || e.val().role === 'Основатель') {
                            setDefaultProfile(e.val());
                            break;
                        }
                        profile_content.innerHTML += `
                        <span>Роль:
                            <select id="user-role" onchange="onRoleChange('${userUid}')">
                                <option${e.val().role === 'Пользователь' ? ' selected' : ''}>Пользователь</option>
                                <option${e.val().role === 'Студент' ? ' selected' : ''}>Студент</option>
                            </select>
                        </span>`;
                        break;
                    case 'Основатель':
					if (e.val().role === 'Основатель') {
                            setDefaultProfile(e.val());
                            break;
                        }
                        profile_content.innerHTML += `
                        <span>Роль:
                            <select id="user-role" onchange="onRoleChange('${userUid}')">
                                <option${e.val().role === 'Пользователь' ? ' selected' : ''}>Пользователь</option>
                                <option${e.val().role === 'Студент' ? ' selected' : ''}>Студент</option>
                                <option${e.val().role === 'Администратор' ? ' selected' : ''}>Администратор</option>
                            </select>
                        </span>`;
                        break;
                    default:
                        setDefaultProfile(e.val());
                }
            } else {
                setDefaultProfile(e.val());
            }
            profileImg.style.display = 'block';
            if (e.val().avatar) {
                profileImg.src = e.val().avatar;
            }
        }
    })
}

function setDefaultProfile(user) {
    profile_content.innerHTML += `<span>Роль: ${user.role}</span>`;
}

function onRoleChange(uid) {
    users.child(uid).child('role').set(document.getElementById('user-role').value);
}
// =============

// AUTHORIZATION
function login() {
    let login_input = document.getElementById('login_input');
    let password_input = document.getElementById('password_input');
    auth.signInWithEmailAndPassword(login_input.value, password_input.value)
        .then(() => {
            document.location.href = '../../index.html';
        })
        .catch(error => {
            alert(error.message);
        });
}

function register() {
    let nick_input = document.getElementById('nick_input');
    let login_input = document.getElementById('login_input');
    let password_input = document.getElementById('password_input');
    let rpassword_input = document.getElementById('rpassword_input');
    if (password_input.value === rpassword_input.value) {
        auth.createUserWithEmailAndPassword(login_input.value, password_input.value)
            .then(res => {
                users.child(res.user.uid).set({
                    email: res.user.email,
                    nick: nick_input.value,
                    role: 'Пользователь'
                });
                document.location.href = '../../index.html';
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

function initUserProfile(value, uid) {
    user = {
        ...value,
        uid
    };
    if (document.getElementById('profile')) {
        document.getElementById('profile').style.display = 'block';
            
        if (document.getElementById('page').getAttribute('page') === 'Login') {
            document.getElementById('profile').innerHTML = `
            <h2 class="logcap">                   
                Вы вошли как: <a id="profile-nickname" href="../Profile/Profile.html?userUid=${uid}">${user.nick}</a>
                <button class="logOut" onclick="logOut()">Выйти</button>
            </h2>`;
        } else {
            document.getElementById('profile-nickname').href += user.uid;
            document.getElementById('profile-nickname').innerHTML = user.nick;
        }
    }
}
// ===========

// USERS
const searchInput = document.getElementById('user-finder');
let usersArray = {};
function initUsers() {
    const isLoadingState = initUsersData();
    isLoadingState.then(() => {
        users.on('value', (e) => {
            if (e.val()) {
                usersArray = e.val();
                updateUsers();
            }
            stopLoadingSpinner();
        });
    });
}

function updateUsers() {
    let usersHtml = '';
    Object.keys(usersArray).forEach(key => {
        if (usersArray[key].nick.match(searchInput.value)) {
            usersHtml += `
            <div class="user-container">
                <div class="avatar">
                    <img src="${usersData[key].avatar ? usersData[key].avatar : '../../img/avatar-no-photo.png'}"/>
                </div>
                <div class="user-info">
                    <a href="../Profile/Profile.html?userUid=${key}">
                        <h1 class="nick">${usersArray[key].nick}</h1><br>
                    </a>
					<div style="margin-top:15px;">
					<span style="font-size: 20px; color: #3e444d; font-weight: 900; ">Роль на форуме:</span>
                    <h3 class="role" style="${getUserRoleStyle(usersArray[key].role)}">${usersArray[key].role}</h3>
					</div>
                </div>
            </div>`;
        }
    });
    document.getElementById('users-list').innerHTML = usersHtml;
}
// ===========

// COMMON FUNCTIONS
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function initUsersData() {
    return new Promise((resolve, reject) => {
        users.on('value', (e) => {
            if (e.val()) {
                Object.keys(e.val()).forEach(key => {
                    usersData[key] = {};
                    usersData[key].avatar = e.val()[key].avatar;
                    usersData[key].role = e.val()[key].role;
                });
                resolve();
            }
        });
    });
}

function getUserRoleStyle(role) {
    let style = '';
    switch(role) {
        case 'Студент':
            style = 'background: #ffff91; border: 1px solid #e6e687; color: black;';
            break;
        case 'Администратор':
            style = 'background: #008000; border: 1px solid #00b300; color: white;';
            break;
        case 'Основатель':
            style = 'background: red; border: 1px solid pink; color: white;';
            break;
        default:
            style = 'background: #cbced6; border: 1px solid #b2efe1; color: black;';
            break;
    }
    return style;
}

function stopLoadingSpinner() {
    document.getElementById('loading').style.display = 'none';
}
// ===========