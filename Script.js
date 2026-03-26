// Backend API URL (would be replaced with actual backend in production)
const API_URL = 'https://your-backend-api.uniport.edu.ng';

// Mock database for user authentication (in a real app, this would be on the server)
const mockUserDatabase = {
    // Pre-populated with some test users
    "test@uniport.edu.ng": {
        username: "testuser",
        email: "test@uniport.edu.ng",
        password: "Test1234", // In a real app, this would be hashed
        token: "mock-token-testuser"
    },
    "student@uniport.edu.ng": {
        username: "student",
        email: "student@uniport.edu.ng",
        password: "Student123",
        token: "mock-token-student"
    }
};

// Enhanced Chat History Storage Module with history panel support
const ChatHistoryManager = {
    // Save a message to history
    saveMessage: function(userId, sender, text) {
        const history = this.getUserHistory(userId);
        const timestamp = new Date().toISOString();
        const message = { sender, text, timestamp };
        history.push(message);
        localStorage.setItem(`uniportChatHistory_${userId}`, JSON.stringify(history));
        
        // Update history panel if open
        if (document.getElementById('history-panel').classList.contains('show')) {
            this.renderHistoryPanel(userId);
        }
        
        return message;
    },
    
    // Get all messages for a user grouped by date
    getUserHistoryByDate: function(userId) {
        const messages = this.getUserHistory(userId);
        const grouped = {};
        
        messages.forEach(msg => {
            const date = new Date(msg.timestamp);
            const dateStr = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            if (!grouped[dateStr]) {
                grouped[dateStr] = [];
            }
            grouped[dateStr].push(msg);
        });
        
        return grouped;
    },
    
    // Get all messages for a user
    getUserHistory: function(userId) {
        return JSON.parse(localStorage.getItem(`uniportChatHistory_${userId}`)) || [];
    },
    
    // Clear chat history for a user
    clearUserHistory: function(userId) {
        localStorage.removeItem(`uniportChatHistory_${userId}`);
        
        // Update history panel if open
        if (document.getElementById('history-panel').classList.contains('show')) {
            this.renderHistoryPanel(userId);
        }
    },
    
    // Format date for display
    formatDate: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },
    
    // Check if date is different from previous message
    isNewDate: function(messages, index, dateString) {
        if (index === 0) return true;
        
        const prevDate = new Date(messages[index - 1].timestamp);
        const currentDate = new Date(dateString);
        
        return prevDate.getDate() !== currentDate.getDate() ||
               prevDate.getMonth() !== currentDate.getMonth() ||
               prevDate.getFullYear() !== currentDate.getFullYear();
    },
    
    // Render chat history to the UI
    renderHistory: function(userId, chatMessagesElement) {
        const messages = this.getUserHistory(userId);
        chatMessagesElement.innerHTML = '';
        
        messages.forEach((msg, index) => {
            // Add date divider if this is a new day
            if (this.isNewDate(messages, index, msg.timestamp)) {
                const dateDivider = document.createElement('div');
                dateDivider.className = 'chat-date-divider';
                dateDivider.textContent = this.formatDate(msg.timestamp);
                chatMessagesElement.appendChild(dateDivider);
            }
            
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.sender}-message`;
            if (msg.sender === 'bot') {
                messageDiv.innerHTML = msg.text;
            } else {
                messageDiv.textContent = msg.text;
            }
            
            // Add timestamp
            const timestampDiv = document.createElement('div');
            timestampDiv.className = 'timestamp';
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            timestampDiv.textContent = time;
            messageDiv.appendChild(timestampDiv);
            
            chatMessagesElement.appendChild(messageDiv);
        });
        
        // Scroll to bottom
        if (messages.length > 0) {
            chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
        }
    },
    
    // Render history panel with grouped conversations
    renderHistoryPanel: function(userId) {
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';
        
        const groupedHistory = this.getUserHistoryByDate(userId);
        
        for (const [date, messages] of Object.entries(groupedHistory)) {
            const dateDiv = document.createElement('div');
            dateDiv.className = 'history-item-date';
            dateDiv.textContent = date;
            historyList.appendChild(dateDiv);
            
            // Group messages by conversation (grouped by time proximity)
            const conversations = this.groupMessagesIntoConversations(messages);
            
            conversations.forEach(convo => {
                const lastMessage = convo[convo.length - 1];
                const preview = lastMessage.sender === 'user' ? 
                    `You: ${lastMessage.text.substring(0, 30)}${lastMessage.text.length > 30 ? '...' : ''}` :
                    `Bot: ${lastMessage.text.substring(0, 30)}${lastMessage.text.length > 30 ? '...' : ''}`;
                
                const time = new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                const item = document.createElement('div');
                item.className = 'history-item';
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between;">
                        <span>${time}</span>
                    </div>
                    <div class="history-item-preview">${preview}</div>
                `;
                
                item.addEventListener('click', () => {
                    this.loadConversation(convo, userId);
                    toggleHistoryPanel();
                });
                
                historyList.appendChild(item);
            });
        }
    },
    
    // Group messages into conversations (messages within 30 minutes of each other)
    groupMessagesIntoConversations: function(messages) {
        if (messages.length === 0) return [];
        
        messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        const conversations = [];
        let currentConvo = [messages[0]];
        
        for (let i = 1; i < messages.length; i++) {
            const prevTime = new Date(messages[i-1].timestamp);
            const currTime = new Date(messages[i].timestamp);
            const diffMinutes = (currTime - prevTime) / (1000 * 60);
            
            if (diffMinutes <= 30) {
                currentConvo.push(messages[i]);
            } else {
                conversations.push(currentConvo);
                currentConvo = [messages[i]];
            }
        }
        
        if (currentConvo.length > 0) {
            conversations.push(currentConvo);
        }
        
        return conversations;
    },
    
    // Load a specific conversation into the chat
    loadConversation: function(conversation, userId) {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = '';
        
        conversation.forEach(msg => {
            if (msg.sender === 'user') {
                addUserMessage(msg.text, msg.timestamp);
            } else {
                addBotMessage(msg.text, msg.timestamp);
            }
        });
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
};

// UNIPORT Assistant FAQ Knowledge Base with all questions
const faqDatabase = {
    // Greetings
    "hi": {
        answer: "Hi there! How can I help you today?",
        category: "Greetings"
    },
    "hello": {
        answer: "Hello there! How can I help you today?",
        category: "Greetings"
    },
    "i am angry": {
        answer: "What is the matter? It seems you had a stressful day. Would you like to share what's bothering you?",
        category: "Greetings"
    },
    "how are you doing": {
        answer: "I am doing great, thanks for asking, how about you? hope you're doing great too.",
        category: "Greetings"
    },
    "is the school hostel application over": {
        answer: "I am not certain, but you can check the school portal, @Arisuniport for more information ",
        category: "Greetings"
    },
    "hi, how are you": {
        answer: "I'm great, thanks for asking! How can I help you today?",
        category: "Greetings"
    },
    "good afternoon": {
        answer: "Good afternoon! How can I be of assistance to you?",
        category: "Greetings"
    },
    "good morning": {
        answer: "Good morning, hope your night was enjoyable! How can I be of assistance to you?",
        category: "Greetings"
    },
    "i am angry, i am sad, my day is bad": {
        answer: " I am really Sorry for that! What really happened?",
        category: "Greetings"
    },
    "hey": {
        answer: "Hey! Nice to see you. How can I assist?",
        category: "Greetings"
    },
    "thanks, thank you, bye": {
        answer: "You're welcome! Have a wonderful day.",
        category: "Greetings"
    },
    "what is uniport dean of student affairs name": {
        answer: "The name of Uniport dean of students affairs is Prof. Chibuike Chima Wokocha",
        category: "Info"
    },
    "okay, ok": {
        answer: "Great! Is there anything else you'd like to know?",
        category: "Greetings"
    },
    
    // Admissions & Registration
    "how do i apply for admission into uniport": {
        answer: "Visit <a href='https://aris.uniport.edu.ng' target='_blank'>UNIPORT ARIS Portal</a>, complete the online form, upload required documents, and pay the application fee.",
        category: "Admissions"
    },
    
"list of hostels in university of port harcourt": {
answer: "Goodluck Jonathan Hostel, Dan Etete Hostel, Nelson Mandela Hostel A, B, C, D, Clinical Hostel, Medical Hostel, Nursing Hostel, NDDC Hostel, King Jaja A, B, C, D, Amino Kano Hostel, NDPC Hostel, Tetfund Hostel, Nuh Hostels, Sport Hostel, Postgraduate Hostel, Pharmacy Hostel",
category: "University Info"
},

"what is the name of the dean of faculty of computing": {
answer: "Prof. Chidiebere Ugwu",
category: "Faculty Info"
},

"what is the name of computer science hod": {
answer: "Dr. B.B. Baridam",
category: "Department Info"
}, 

"what are the computer science admission requirements": {
answer: "Five (5) credit passes including English, Mathematics, Physics, and Chemistry in O'level exams like SSCE, WAEC, or NECO, and you must be at 16 years of age or above",
category: "Admissions"
},

"names of computer science department lecturers in uniport": {
answer: "Prof. Chidiebere Ugwu, Prof. B.O. Eke, Prof. F.E. Onuodu, Prof. E.E. Ogheneovo, Dr. U.A. Okengwu, Dr. Vivian Anthony, Dr. B.B. Baridam, Dr. C.B. Marcus, Dr. A.O. Ugbari, Dr. M.O. Musa, Dr. L.C. Ochei, Mr. Ekeocha, Mr. Wisdom, Mr. E. Wobidi, Mr. M.F. Edafe",
category: "Faculty Info"
},

"what is computer ccience freshers amount in uniport": {
answer: "₦115,500",
category: "Fees"
},
    "what are the admission requirements": {
        answer: "5 O'Level credits (including English & Math), valid JAMB score, and Post-UTME screening.",
        category: "Admissions"
    },
    "what is uniport's cut off mark": {
        answer: "Varies by course (usually 150+ for most programs).",
        category: "Admissions"
    },
    "can i change my course after admission": {
        answer: "Yes, via JAMB CAPS and departmental approval (conditions apply).",
        category: "Admissions"
    },
    "how do i check my admission status": {
        answer: "Log in to JAMB CAPS or UNIPORT admission portal at <a href='https://aris.uniport.edu.ng' target='_blank'>ARIS Portal</a> or contact 09067037543.",
        category: "Admissions"
    },
    
    // Academics & Exams
    "how is uniport's gpa calculated": {
        answer: "UNIPORT's GPA system:<br>A (70-100%) = 5.0<br>B (60-69%) = 4.0<br>C (50-59%) = 3.0<br>D (45-49%) = 2.0<br>F (0-39%) = 0.0",
        category: "Academics"
    },
    "how do i check my exam results": {
        answer: "Log in to <a href='https://aris.uniport.edu.ng' target='_blank'>UNIPORT ARIS Portal</a> → Academic Records → View Results. You can also visit your Head of Department's office to check in person.",
        category: "Academics"
    },
    "what happens if i fail a course": {
        answer: "You may retake it next semester (this will affect your GPA).",
        category: "Academics"
    },
    "how do i apply for a carryover exam": {
        answer: "Register in <a href='https://aris.uniport.edu.ng' target='_blank'>ARIS portal</a> during the supplementary exam period and pay the required fee for extra year students.",
        category: "Academics"
    },
    "what is uniport's attendance policy": {
        answer: "Minimum 95% attendance required to sit for exams.",
        category: "Academics"
    },
    
    // About School
    "how many campuses are in uniport": {
        answer: "There are three campuses in UNIPORT: Choba campus (main campus), Delta campus, and Abuja campus.",
        category: "About School"
    },
    "who is the vice chancellor of uniport": {
        answer: "Professor Georgewill Owunari.",
        category: "About School"
    },
    "is uniport the best when it comes to engineering": {
        answer: "Yes, UNIPORT has high standards of teaching and learning, and it's also known as an entrepreneurship-focused school.",
        category: "About School"
    },
    "when was uniport founded": {
        answer: "It was founded in 1975.",
        category: "About School"
    },
    "how much is university of port harcourt acceptance fee": {
        answer: "No acceptance fee is needed for new students.",
        category: "About School"
    },
    "what rank is uniport in nigeria": {
        answer: "University of Port Harcourt ranks #13 in Nigeria in our Meta ranking of 108 university rankings.",
        category: "About School"
    },
    
    // Hostel & Accommodation
    "how do i apply for a hostel": {
        answer: "Submit an application via the Student Affairs Division (limited spaces) or apply via <a href='https://aris.uniport.edu.ng' target='_blank'>ARIS portal</a>.",
        category: "Hostel"
    },
    "what are the hostel fees": {
        answer: "Between ₦50,000 - ₦80,000 per session (depending on room type).",
        category: "Hostel"
    },
    "are there private hostels near uniport": {
        answer: "Yes, areas like Aluu, Choba, Rumuosi, Alakahia and behind Chem have good options.",
        category: "Hostel"
    },
    "are there hostels available?": {
        answer: "Yes, on-campus hostels are available but you need to check with the Student Affairs Unit in the Convocation Arena. Off-campus options are available in areas like Aluu, Choba, Rumuosi, Alakahia and behind Chem.",
        category: "Hostel"
    },
    "can i cook in the hostel": {
        answer: "Yes, cooking in UNIPORT hostels is allowed.",
        category: "Hostel"
    },
    "what items are prohibited in hostels": {
        answer: "Electric kettles, hot plates, refrigerators, air conditioners and illegal substances.",
        category: "Hostel"
    },
    
    // Fees & Financial Aid
    "what is the school fee for medicine students": {
        answer: "Around ₦250,000 -- ₦350,000 for newly admitted students and ₦78,000 for returning students per academic session.",
        category: "Fees"
    },
    "are there scholarships for uniport students": {
        answer: "Yes, including Agbami, PTDF, NNPC, and MTN scholarships.",
        category: "Fees"
    },
    "how do i pay my school fees": {
        answer: "Via Remita on <a href='https://aris.uniport.edu.ng' target='_blank'>ARIS portal</a>.",
        category: "Fees"
    },
    "can i pay fees in installments": {
        answer: "Yes, half payment is required before course registration and full payment for newly admitted students before registration.",
        category: "Fees"
    },
    "how much is uniport school fees": {
        answer: "Freshers full-time tuition is ₦190,000 - ₦241,000 and part-time is ₦122,000 -- ₦137,000. Returning students full-time tuition is ₦78,000 and part-time is ₦90,000.",
        category: "Fees"
    },
    "what happens if i don't pay fees on time": {
        answer: "Late payment attracts penalties, and you may be barred from exams.",
        category: "Fees"
    },
    
    // ICT & E-Learning
    "how do i reset my uniport portal password": {
        answer: "Click 'Forgot Password' on <a href='https://aris.uniport.edu.ng' target='_blank'>ARIS Portal</a> or visit ICT support.",
        category: "ICT"
    },
    "is there free wi fi on campus": {
        answer: "Limited Wi-Fi is available in the library and some departments.",
        category: "ICT"
    },
    "how do i access uniport's e-learning portal": {
        answer: "Visit <a href='http://elearn.uniport.edu.ng' target='_blank'>elearn.uniport.edu.ng</a>.",
        category: "ICT"
    },
    "what do i do if the portal is not working": {
        answer: "Clear your browser cache or contact ICT support.",
        category: "ICT"
    },
    "how do i register courses online": {
        answer: "Log in to the <a href='https://aris.uniport.edu.ng' target='_blank'>ARIS portal</a> during the course registration period.",
        category: "ICT"
    },
    
    // Health & Counseling
    "where is uniport's medical center located": {
        answer: "Towards Delta Campus gate by Ghanama street.",
        category: "Health"
    },
    "do i need to pay for medical services": {
        answer: "Basic treatments are free for students (show ID card).",
        category: "Health"
    },
    "how do i access counseling services": {
        answer: "Visit the Student Affairs or Counselling Unit.",
        category: "Health"
    },
    "what vaccines are required for uniport students": {
        answer: "Yellow fever vaccination is mandatory.",
        category: "Health"
    },
    "can i get emergency medical help at night": {
        answer: "Yes, the medical center has 24/7 emergency services.",
        category: "Health"
    },
    
    // Security & Safety
    "is uniport campus safe": {
        answer: "Yes, but avoid walking alone at night.",
        category: "Security"
    },
    "what security numbers should i save": {
        answer: "UNIPORT Security Hotline: +234 9067037543.",
        category: "Security"
    },
    "what do i do if i lose my id card": {
        answer: "Report to Security Unit and apply for a replacement.",
        category: "Security"
    },
    "are there cctv cameras on campus": {
        answer: "Yes, in key areas like the library and admin blocks.",
        category: "Security"
    },
    "i am hungry ": {
        answer: "Yes, you can get yourself food or you can eat snacks.",
        category: "Care"
    },
    "what can a student do to make money": {
        answer: "Building yourself and also doing trading of stocks in Choba or Aluu markets ",
        category: "Update"
    },
    "how do i report harassment": {
        answer: "Contact the Student Affairs Division or Security Unit.",
        category: "Security"
    },
    
    // Graduation & Transcripts
    "how do i apply for my transcript": {
        answer: "Visit the Academic Affairs Unit or apply online at <a href='https://aris.uniport.edu.ng' target='_blank'>ARIS Portal</a>.",
        category: "Graduation"
    },
    "how long does it take to process a transcript": {
        answer: "2-4 weeks (express service available).",
        category: "Graduation"
    },
    "what is the graduation clearance process": {
        answer: "Return all library books, pay dues, and complete clearance forms.",
        category: "Graduation"
    },
    "can i attend convocation if i owe school fees": {
        answer: "No, all fees must be cleared.",
        category: "Graduation"
    },
    "how do i check my graduation date": {
        answer: "Visit the Registry or check the UNIPORT website.",
        category: "Graduation"
    },
    
    "default": {
        answer: "I'm not sure about that. Could you rephrase your question? Here are some topics I can help you with:<br>- Admissions & Registration<br>- Academics & Exams<br>- Hostel & Accommodation<br>- Fees & Financial Aid<br>- ICT & E-Learning<br>- Health & Counseling<br>- Security & Safety<br>- Graduation & Transcripts<br><br>You can also visit the official <a href='https://aris.uniport.edu.ng' target='_blank'>UNIPORT ARIS Portal</a> for more information.",
        category: "General"
    }
};

// Current user
let currentUser = null;
let authToken = null;

// DOM Elements
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const signupUsername = document.getElementById('signup-username');
const signupEmail = document.getElementById('signup-email');
const signupPassword = document.getElementById('signup-password');
const signupError = document.getElementById('signup-error');
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');
const loginButton = document.getElementById('login-button');
const signupButton = document.getElementById('signup-button');
const logoutButton = document.getElementById('logout-button');
const clearChatButton = document.getElementById('clear-chat');
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const suggestionButtons = document.querySelectorAll('.suggestion-btn');
const usernameDisplay = document.getElementById('username-display');
const historyToggle = document.getElementById('history-toggle');
const historyPanel = document.getElementById('history-panel');
const historyOverlay = document.getElementById('history-overlay');
const closeHistory = document.getElementById('close-history');

// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);
showSignup.addEventListener('click', showSignupForm);
showLogin.addEventListener('click', showLoginForm);
loginButton.addEventListener('click', handleLogin);
signupButton.addEventListener('click', handleSignup);
logoutButton.addEventListener('click', handleLogout);
clearChatButton.addEventListener('click', clearChat);
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
});
suggestionButtons.forEach(btn => {
    btn.addEventListener('click', function() {
        userInput.value = this.textContent;
        sendMessage();
    });
});
historyToggle.addEventListener('click', toggleHistoryPanel);
closeHistory.addEventListener('click', toggleHistoryPanel);
historyOverlay.addEventListener('click', toggleHistoryPanel);

// Toggle history panel visibility
function toggleHistoryPanel() {
    historyPanel.classList.toggle('show');
    historyOverlay.classList.toggle('show');
    if (historyPanel.classList.contains('show') && currentUser) {
        ChatHistoryManager.renderHistoryPanel(currentUser.email);
    }
}

// Initialize the application
function initApp() {
    // Check if user is already logged in (from localStorage)
    const storedUser = localStorage.getItem('uniportChatbotUser');
    const storedToken = localStorage.getItem('uniportChatbotToken');
    
    if (storedUser && storedToken) {
        currentUser = JSON.parse(storedUser);
        authToken = storedToken;
        showChatInterface();
        // Load chat history for this user
        ChatHistoryManager.renderHistory(currentUser.email, chatMessages);
    }
}

// Show signup form
function showSignupForm() {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    clearErrors();
}

// Show login form
function showLoginForm() {
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    clearErrors();
}

// Clear error messages
function clearErrors() {
    loginError.textContent = '';
    signupError.textContent = '';
}

// Handle login
async function handleLogin() {
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    
    if (!email || !password) {
        loginError.textContent = 'Please enter both email and password';
        return;
    }
    
    try {
        // In a real app, this would call your backend API
        const response = await mockBackendLogin(email, password);
        
        if (response.success) {
            currentUser = response.user;
            authToken = response.token;
            
            // Store user session
            localStorage.setItem('uniportChatbotUser', JSON.stringify(currentUser));
            localStorage.setItem('uniportChatbotToken', authToken);
            
            showChatInterface();
            // Load chat history for this user
            ChatHistoryManager.renderHistory(currentUser.email, chatMessages);
            // Add welcome message
            addBotMessage("Welcome back to UNIPORT Assistant! How can I help you today?");
        } else {
            loginError.textContent = response.message || 'Login failed';
        }
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = 'An error occurred during login';
    }
}

// Handle signup
async function handleSignup() {
    const username = signupUsername.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value.trim();
    
    if (!username || !email || !password) {
        signupError.textContent = 'Please fill in all fields';
        return;
    }
    
    if (password.length < 8) {
        signupError.textContent = 'Password must be at least 8 characters';
        return;
    }
    
    try {
        // In a real app, this would call your backend API
        const response = await mockBackendSignup(username, email, password);
        
        if (response.success) {
            currentUser = response.user;
            authToken = response.token;
            
            // Store user session
            localStorage.setItem('uniportChatbotUser', JSON.stringify(currentUser));
            localStorage.setItem('uniportChatbotToken', authToken);
            
            showChatInterface();
            // Add welcome message
            addBotMessage("Welcome to UNIPORT Assistant! I can help you with information about admissions, academics, hostels, fees, and more. What would you like to know?");
        } else {
            signupError.textContent = response.message || 'Signup failed';
        }
    } catch (error) {
        console.error('Signup error:', error);
        signupError.textContent = 'An error occurred during signup';
    }
}

// Handle logout
async function handleLogout() {
    try {
        // In a real app, this would call your backend API to invalidate the token
        await mockBackendLogout(authToken);
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Clear local session
        currentUser = null;
        authToken = null;
        localStorage.removeItem('uniportChatbotUser');
        localStorage.removeItem('uniportChatbotToken');
        
        showAuthInterface();
        clearChat();
    }
}

// Show chat interface
function showChatInterface() {
    authContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    historyToggle.classList.remove('hidden');
    usernameDisplay.textContent = currentUser.username;
}

// Show auth interface
function showAuthInterface() {
    authContainer.classList.remove('hidden');
    chatContainer.classList.add('hidden');
    historyToggle.classList.add('hidden');
    historyPanel.classList.remove('show');
    historyOverlay.classList.remove('show');
    
    showLoginForm();
    loginEmail.value = '';
    loginPassword.value = '';
    signupUsername.value = '';
    signupEmail.value = '';
    signupPassword.value = '';
    clearErrors();
}

// Clear chat messages
function clearChat() {
    if (currentUser) {
        ChatHistoryManager.clearUserHistory(currentUser.email);
    }
    chatMessages.innerHTML = '';
}

// Send message to chatbot
async function sendMessage() {
    const question = userInput.value.trim();
    if (question === '') return;
    
    // Add user message to chat and history
    addUserMessage(question);
    if (currentUser) {
        ChatHistoryManager.saveMessage(currentUser.email, 'user', question);
    }
    
    userInput.value = '';
    
    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('typing-indicator');
    typingDiv.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        // In a real app, this would call your backend API
        const response = await mockBackendSendMessage(question, authToken);
        
        // Remove typing indicator
        chatMessages.removeChild(typingDiv);
        
        if (response.success) {
            // Add bot message to chat and history
            addBotMessage(response.answer);
            if (currentUser) {
                ChatHistoryManager.saveMessage(currentUser.email, 'bot', response.answer);
            }
        } else {
            addBotMessage("Sorry, I'm having trouble responding right now. Please try again later.");
        }
    } catch (error) {
        console.error('Error sending message:', error);
        // Remove typing indicator
        if (typingDiv.parentNode === chatMessages) {
            chatMessages.removeChild(typingDiv);
        }
        addBotMessage("Sorry, I'm having trouble responding right now. Please try again later.");
    }
}

// Get answer from FAQ database
function getAnswer(question) {
    const cleanQuestion = question.toLowerCase().trim().replace(/[^\w\s]/g, '');
    
    // Check for exact matches first
    if (faqDatabase[cleanQuestion]) {
        return faqDatabase[cleanQuestion].answer;
    }
    
    // Check for partial matches
    for (const [key, value] of Object.entries(faqDatabase)) {
        if (cleanQuestion.includes(key) || key.includes(cleanQuestion)) {
            return value.answer;
        }
    }
    
    // Return default response if no match found
    return faqDatabase["default"].answer;
}

// Add user message to chat
function addUserMessage(message, timestamp = new Date().toISOString()) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'user-message');
    messageDiv.textContent = message;
    
    // Add timestamp
    const timestampDiv = document.createElement('div');
    timestampDiv.className = 'timestamp';
    timestampDiv.textContent = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messageDiv.appendChild(timestampDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add bot message to chat
function addBotMessage(message, timestamp = new Date().toISOString()) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'bot-message');
    messageDiv.innerHTML = message;
    
    // Add timestamp
    const timestampDiv = document.createElement('div');
    timestampDiv.className = 'timestamp';
    timestampDiv.textContent = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messageDiv.appendChild(timestampDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Enhanced mock backend functions with proper authentication
async function mockBackendLogin(email, password) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if user exists in our mock database
    if (mockUserDatabase[email]) {
        // Check if password matches (in a real app, this would compare hashed passwords)
        if (mockUserDatabase[email].password === password) {
            return {
                success: true,
                user: {
                    username: mockUserDatabase[email].username,
                    email: email
                },
                token: mockUserDatabase[email].token,
                message: 'Login successful'
            };
        } else {
            return {
                success: false,
                message: 'Incorrect password'
            };
        }
    } else {
        return {
            success: false,
            message: 'User not found. Please sign up first.'
        };
    }
}

async function mockBackendSignup(username, email, password) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if email already exists
    if (mockUserDatabase[email]) {
        return {
            success: false,
            message: 'Email already registered. Please login instead.'
        };
    }
    
    // Create new user in our mock database
    mockUserDatabase[email] = {
        username: username,
        email: email,
        password: password, // In a real app, this would be hashed
        token: 'mock-token-' + Math.random().toString(36).substring(2)
    };
    
    return {
        success: true,
        user: {
            username: username,
            email: email
        },
        token: mockUserDatabase[email].token,
        message: 'Signup successful'
    };
}

async function mockBackendLogout(token) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // In a real app, this would invalidate the token on the server
    return { success: true };
}

async function mockBackendSendMessage(message, token) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    
    // Verify token (in a real app, this would be done on the server)
    if (!token) {
        return {
            success: false,
            message: 'Unauthorized'
        };
    }
    
    // In a real app, this would send the message to your backend
    // which might use NLP or other processing to generate a response
    // Here we just use our local FAQ database
    return {
        success: true,
        answer: getAnswer(message)
    };
}
