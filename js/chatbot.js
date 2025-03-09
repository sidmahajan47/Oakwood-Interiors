// API configuration
const API_KEY = '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';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Initialize chat history and lead storage
let chatHistory = [];
let leadInfo = {
    name: '',
    phone: '',
    location: '',
    projectType: '',
    designStyle: '',
    budget: '',
    timeline: '',
    email: '',
    timestamp: '',
    leadSource: 'Website Chatbot'
};

// List of interior design topics for better context
const designTopics = [
    "modern interior design", "minimalist spaces", "color schemes", 
    "furniture selection", "space planning", "kitchen design", 
    "bathroom renovation", "lighting solutions", "home office setup",
    "sustainable materials", "luxury interiors", "budget-friendly makeovers"
];

// Questionnaire stages for lead qualification
const QUESTIONNAIRE_STAGES = {
    NONE: 'none',
    NAME: 'name',
    PROJECT_TYPE: 'project_type',
    DESIGN_STYLE: 'design_style',
    BUDGET: 'budget',
    TIMELINE: 'timeline',
    COMPLETE: 'complete'
};

// Initialize variables
let currentQuestionnaireStage = QUESTIONNAIRE_STAGES.NAME;
let isQuestionnaireActive = false;
let isProcessingMessage = false; // Prevent multiple concurrent API requests
let typingTimeout = null;
let keyboardInterval = null;

// Performance optimization: Debounce function to limit rapid executions
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// DOM elements
const chatbotButton = document.querySelector('.chatbot-button');
const chatbotContainer = document.querySelector('.chatbot-container');
const chatbotBox = document.querySelector('.chatbot-box');
const closeButton = document.querySelector('.close-chat');
const sendButton = document.getElementById('send-message');
const userInput = document.getElementById('user-message');
const messagesContainer = document.querySelector('.chatbot-messages');
const emailCollector = document.querySelector('.chatbot-email-collector');
const emailInput = document.getElementById('client-email');
const submitEmailButton = document.getElementById('submit-email');
const notificationBadge = document.querySelector('.notification-badge');

// Lead storage configuration
const LEAD_STORAGE = {
    // Local storage key for temporary leads
    LOCAL_STORAGE_KEY: 'oakwood_leads',
    
    // Server endpoint for lead submission (replace with your actual endpoint)
    API_ENDPOINT: '/api/leads',
    
    // Save lead to local storage for backup
    saveToLocalStorage: function(lead) {
        try {
            // Get existing leads
            const existingLeads = JSON.parse(localStorage.getItem(this.LOCAL_STORAGE_KEY) || '[]');
            
            // Add new lead with timestamp
            lead.timestamp = new Date().toISOString();
            existingLeads.push(lead);
            
            // Save back to localStorage
            localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(existingLeads));
            console.log('Lead saved to local storage');
        } catch (error) {
            console.error('Error saving lead to local storage:', error);
        }
    },
    
    // Send lead to server
    sendToServer: function(lead) {
        // Add timestamp if not present
        if (!lead.timestamp) {
            lead.timestamp = new Date().toISOString();
        }
        
        console.log('Lead ready for server submission:', lead);
        
        // Uncomment to send to your server
        /*
        fetch(this.API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add any authentication headers needed
            },
            body: JSON.stringify(lead)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Lead successfully sent to server:', data);
        })
        .catch(error => {
            console.error('Error sending lead to server:', error);
            // Save to local storage as backup
            this.saveToLocalStorage(lead);
        });
        */
    }
};

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Only proceed if the chatbot elements exist
    if (!chatbotButton || !chatbotContainer) return;
    
    // Initialize chatbot with performance optimizations
    initChatbot();
    
    // Show first message after a delay
    setTimeout(() => {
        if (messagesContainer.querySelectorAll('.message').length === 0) {
            addMessage("Hello! Welcome to Oakwood Design. I can help with interior design ideas and suggestions. What's your name?", 'bot');
        }
    }, 1000);
});

// Initialize chatbot with optimized event listeners
function initChatbot() {
    // Use event delegation where possible to reduce listener count
    document.addEventListener('click', handleDocumentClick);
    
    // Essential direct event listeners
    if (userInput) {
        userInput.addEventListener('keypress', handleInputKeypress);
    }
    
    if (submitEmailButton) {
        submitEmailButton.addEventListener('click', submitEmailHandler);
    }
    
    // Optimize viewport handling
    const debouncedViewportHandler = debounce(handleMobileViewportHeight, 200);
    window.addEventListener('resize', debouncedViewportHandler);
    window.addEventListener('orientationchange', debouncedViewportHandler);
    
    // Initial viewport adjustment
    handleMobileViewportHeight();
}

// Handle document clicks with event delegation
function handleDocumentClick(event) {
    // Toggle chatbot
    if (event.target.closest('.chatbot-button')) {
        toggleChatbot();
        return;
    }
    
    // Close chatbot
    if (event.target.closest('.close-chat')) {
        chatbotContainer.classList.remove('active');
        return;
    }
    
    // Send message
    if (event.target.closest('#send-message')) {
        sendMessage();
        return;
    }
    
    // Handle option buttons
    if (event.target.closest('.option-button')) {
        const button = event.target.closest('.option-button');
        const value = button.textContent.trim();
        const callback = window.optionCallback;
        
        // Remove options UI
        const optionsContainer = button.closest('.chatbot-questionnaire');
        if (optionsContainer) {
            optionsContainer.remove();
        }
        
        // Add user selection as a message
        addMessage(value, 'user');
        
        // Call the callback if it exists
        if (typeof callback === 'function') {
            callback(value);
        }
    }
}

// Handle input keypress
function handleInputKeypress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Toggle chatbot visibility
function toggleChatbot() {
    chatbotContainer.classList.toggle('active');
    
    // Hide notification when chat is opened
    if (chatbotContainer.classList.contains('active')) {
        hideNotification();
        userInput.focus();
    }
}

// Show notification badge
function showNotification() {
    notificationBadge.classList.remove('hidden');
}

// Hide notification badge
function hideNotification() {
    notificationBadge.classList.add('hidden');
}

// Create and display a multi-option question
function showOptions(question, options, callback) {
    const questionnaireElement = document.querySelector('.chatbot-questionnaire');
    questionnaireElement.innerHTML = '';
    questionnaireElement.classList.remove('hidden');
    
    const questionText = document.createElement('p');
    questionText.textContent = question;
    questionnaireElement.appendChild(questionText);
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'option-buttons';
    
    options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'option-button';
        button.textContent = option;
        button.addEventListener('click', () => {
            callback(option);
            questionnaireElement.classList.add('hidden');
            addMessage(option, 'user');
        });
        optionsContainer.appendChild(button);
    });
    
    questionnaireElement.appendChild(optionsContainer);
}

// Submit email handler
function submitEmailHandler() {
    const email = emailInput.value.trim();
    if (isValidEmail(email)) {
        leadInfo.email = email;
        emailCollector.classList.add('hidden');
        addMessage(email, 'user');
        confirmLeadInformation();
    } else {
        // Show error for invalid email
        emailInput.style.borderColor = 'red';
        setTimeout(() => {
            emailInput.style.borderColor = '';
        }, 2000);
    }
}

// Send a message
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    // Clear input right away to improve UX
    const userMessageText = message;
    userInput.value = '';
    
    // Add user message to chat with explicit styling - bypassing addMessage for direct control
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';
    messageDiv.innerHTML = `<p>${userMessageText}</p>`;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Force layout recalculation to ensure proper rendering and visibility
    void messageDiv.offsetHeight;
    
    // Check if we're in questionnaire mode
    if (currentQuestionnaireStage !== QUESTIONNAIRE_STAGES.NONE) {
        processQuestionnaireResponse(userMessageText);
        return;
    }
    
    // Otherwise, process normally with API
    addTypingAnimation();
    
    try {
        // Add user message to history
        chatHistory.push({ role: "user", content: userMessageText });
        
        // Get response from API
        const response = await getChatResponse(chatHistory);
        
        // Remove typing animation and add bot response
        removeTypingAnimation();
        addMessage(response, 'bot');
        
        // Add bot response to history
        chatHistory.push({ role: "assistant", content: response });
        
        // If we haven't started the questionnaire yet and we're not in it,
        // check if we should start it based on user's message
        if (currentQuestionnaireStage === QUESTIONNAIRE_STAGES.NONE && 
            (userMessageText.toLowerCase().includes('help') || 
             userMessageText.toLowerCase().includes('design') || 
             userMessageText.toLowerCase().includes('renovation') ||
             userMessageText.toLowerCase().includes('remodel') ||
             userMessageText.toLowerCase().includes('consult'))) {
            
            setTimeout(() => {
                startQuestionnaire();
            }, 1500);
        }
    } catch (error) {
        console.error("Error getting response:", error);
        removeTypingAnimation();
        
        // Fallback response
        const fallback = getDesignFallbackResponse();
        addMessage(fallback, 'bot');
    }
}

// Start the lead questionnaire process
function startQuestionnaire() {
    currentQuestionnaireStage = QUESTIONNAIRE_STAGES.NAME;
    addMessage("I'd love to help you with your interior design project! To provide personalized assistance, could you please tell me your name?", 'bot');
}

// Process questionnaire responses and move to next stage
function processQuestionnaireResponse(message) {
    switch(currentQuestionnaireStage) {
        case QUESTIONNAIRE_STAGES.NAME:
            leadInfo.name = message;
            currentQuestionnaireStage = QUESTIONNAIRE_STAGES.PROJECT_TYPE;
            addTypingAnimation();
            setTimeout(() => {
                removeTypingAnimation();
                addMessage(`Nice to meet you, ${leadInfo.name}! Could you please tell me what type of interior design project you're interested in?`, 'bot');
            }, 1000);
            break;
            
        case QUESTIONNAIRE_STAGES.PROJECT_TYPE:
            leadInfo.projectType = message;
            currentQuestionnaireStage = QUESTIONNAIRE_STAGES.DESIGN_STYLE;
            addTypingAnimation();
            setTimeout(() => {
                removeTypingAnimation();
                addMessage(`Thank you! What design style do you prefer for your project?`, 'bot');
            }, 1000);
            break;
            
        case QUESTIONNAIRE_STAGES.DESIGN_STYLE:
            leadInfo.designStyle = message;
            currentQuestionnaireStage = QUESTIONNAIRE_STAGES.BUDGET;
            addTypingAnimation();
            setTimeout(() => {
                removeTypingAnimation();
                addMessage(`What budget range are you considering for this project?`, 'bot');
            }, 1000);
            break;
            
        case QUESTIONNAIRE_STAGES.BUDGET:
            leadInfo.budget = message;
            currentQuestionnaireStage = QUESTIONNAIRE_STAGES.TIMELINE;
            addTypingAnimation();
            setTimeout(() => {
                removeTypingAnimation();
                addMessage(`What's your timeline for this project?`, 'bot');
            }, 1000);
            break;
            
        case QUESTIONNAIRE_STAGES.TIMELINE:
            leadInfo.timeline = message;
            currentQuestionnaireStage = QUESTIONNAIRE_STAGES.COMPLETE;
            addTypingAnimation();
            setTimeout(() => {
                removeTypingAnimation();
                addMessage("Great! Could you please provide your email address so we can send you some design ideas and follow up information?", 'bot');
                emailCollector.classList.remove('hidden');
                emailInput.focus();
            }, 1000);
            break;
            
        default:
            // If we're not in a specific stage, just forward to the API
            handleGenericMessage(message);
            break;
    }
}

// Handle generic message with API
async function handleGenericMessage(message) {
    addTypingAnimation();
    
    try {
        // Add user message to history
        chatHistory.push({ role: "user", content: message });
        
        // Get response from API
        const response = await getChatResponse(chatHistory);
        
        // Remove typing animation and add bot response
        removeTypingAnimation();
        addMessage(response, 'bot');
        
        // Add bot response to history
        chatHistory.push({ role: "assistant", content: response });
    } catch (error) {
        console.error("Error getting response:", error);
        removeTypingAnimation();
        
        // Fallback response
        const fallback = getDesignFallbackResponse();
        addMessage(fallback, 'bot');
    }
}

// Confirm lead information collected
function confirmLeadInformation() {
    currentQuestionnaireStage = QUESTIONNAIRE_STAGES.COMPLETE;
    
    const summary = `
        Name: ${leadInfo.name}
        Project: ${leadInfo.projectType}
        Style Preference: ${leadInfo.designStyle}
        Budget Range: ${leadInfo.budget}
        Timeline: ${leadInfo.timeline}
        Email: ${leadInfo.email}
    `;
    
    // Store lead information in both local storage and attempt server submission
    leadInfo.timestamp = new Date().toISOString();
    LEAD_STORAGE.saveToLocalStorage(leadInfo);
    LEAD_STORAGE.sendToServer(leadInfo);
    
    // Log for development purposes
    console.log("Lead collected and stored:", leadInfo);
    
    addTypingAnimation();
    setTimeout(() => {
        removeTypingAnimation();
        
        // Show confirmation and summary
        addMessage(`Thank you for sharing your information with us, ${leadInfo.name}! Here's what I've collected:`, 'bot');
        
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'message bot summary';
        summaryDiv.innerHTML = `<p>${summary.replace(/\n/g, '<br>')}</p>`;
        messagesContainer.appendChild(summaryDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Provide personalized recommendations
        setTimeout(() => {
            provideDesignRecommendations();
        }, 1500);
    }, 1500);
}

// Provide personalized design recommendations
function provideDesignRecommendations() {
    currentQuestionnaireStage = QUESTIONNAIRE_STAGES.COMPLETE;
    
    addTypingAnimation();
    setTimeout(() => {
        removeTypingAnimation();
        
        // Create personalized recommendation based on collected info
        let recommendation = getPersonalizedRecommendation();
        addMessage(recommendation, 'bot');
        
        // Show relevant design example
        showRelevantProjectExample(leadInfo.projectType);
        
        // Offer next steps
        setTimeout(() => {
            addMessage(`Would you like to schedule a consultation with one of our design experts? They can provide more detailed insights and a personalized plan for your ${leadInfo.projectType.toLowerCase()}.`, 'bot');
            
            setTimeout(() => {
                showOptions("Would you like to schedule a consultation?", [
                    "Yes, let's schedule a call", 
                    "Send me more information first", 
                    "I'll think about it"
                ], (selected) => {
                    if (selected.includes("Yes")) {
                        addMessage(`Excellent! One of our design experts will call you at ${leadInfo.phone} within the next 24-48 hours to discuss your project in more detail. Is there a specific time that works best for you?`, 'bot');
                    } else if (selected.includes("Send me")) {
                        addMessage(`No problem! We'll send some design inspiration and information about our services to ${leadInfo.email}. Feel free to ask if you have any questions in the meantime.`, 'bot');
                    } else {
                        addMessage(`Of course, take your time! Your information is saved, and you can always reach out when you're ready to move forward. In the meantime, is there anything else I can help you with?`, 'bot');
                    }
                });
            }, 1000);
        }, 3000);
    }, 1500);
}

// Get personalized recommendation based on lead info
function getPersonalizedRecommendation() {
    let recommendation = `Based on your preference for ${leadInfo.designStyle} design and your ${leadInfo.projectType.toLowerCase()} project, I have a few suggestions:`;
    
    if (leadInfo.designStyle === "Modern" || leadInfo.designStyle === "Minimalist") {
        recommendation += `\n\n1. Consider clean lines and a neutral color palette with bold accent pieces.
2. Incorporate multi-functional furniture to maximize your space.
3. Add statement lighting fixtures as focal points.`;
    } else if (leadInfo.designStyle === "Traditional") {
        recommendation += `\n\n1. Elegant furnishings with ornate details would enhance your space.
2. Consider rich wood tones and classic patterns.
3. Layer textiles for depth and comfort.`;
    } else if (leadInfo.designStyle === "Industrial") {
        recommendation += `\n\n1. Expose architectural elements like brick walls or pipes.
2. Incorporate metal finishes and weathered wood.
3. Add vintage-inspired lighting and furniture pieces.`;
    } else {
        recommendation += `\n\n1. Create a personalized mood board to refine your vision.
2. Focus on a color scheme that reflects the mood you want to achieve.
3. Select statement pieces that anchor your space and express your personality.`;
    }
    
    if (leadInfo.projectType === "Kitchen Remodel") {
        recommendation += `\n\nFor your kitchen project, our design team can create a layout that maximizes functionality while incorporating your ${leadInfo.designStyle.toLowerCase()} style preferences. We'd focus on cabinetry, countertop materials, and lighting that work with your budget of ${leadInfo.budget}.`;
    } else if (leadInfo.projectType === "Bathroom Renovation") {
        recommendation += `\n\nFor your bathroom renovation, we can suggest fixture selections, tile designs, and storage solutions that align with your ${leadInfo.designStyle.toLowerCase()} aesthetic while working within your ${leadInfo.budget} budget.`;
    }
    
    recommendation += `\n\nOur design services include 3D renderings, material selection, and furniture recommendations tailored to your specific needs.`;
    
    return recommendation;
}

// Show a relevant project example based on user interests
function showRelevantProjectExample(projectType) {
    let imagePath = '';
    let projectDescription = '';
    
    // Match image and description based on project type
    if (projectType.includes('Kitchen')) {
        imagePath = 'assets/images/img1.jpg';
        projectDescription = 'Here\'s a kitchen redesign we completed recently that our clients loved!';
    } else if (projectType.includes('Bathroom')) {
        imagePath = 'assets/images/img5.jpg';
        projectDescription = 'This bathroom transformation might inspire your project!';
    } else if (projectType.includes('Living') || projectType.includes('Room')) {
        imagePath = 'assets/images/img6.jpg';
        projectDescription = 'Our clients were thrilled with this living room makeover!';
    } else if (projectType.includes('Home')) {
        imagePath = 'assets/images/hero-background.jpg';
        projectDescription = 'We transformed this entire home with a cohesive design approach!';
    } else {
        imagePath = 'assets/images/img7.jpg';
        projectDescription = 'This is one of our recent projects you might find inspiring!';
    }
    
    // Add message with image
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot with-image';
    messageDiv.innerHTML = `<p>${projectDescription}</p><img src="${imagePath}" alt="Project example">`;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Add a message to the chat
function addMessage(message, sender) {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    // Process message text (handle links, formatting)
    let processedMessage = message;
    
    // Convert URLs to clickable links
    processedMessage = processedMessage.replace(
        /(https?:\/\/[^\s]+)/g, 
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    
    // Convert newlines to <br> tags
    processedMessage = processedMessage.replace(/\n/g, '<br>');
    
    // Format design terms with subtle highlight
    if (sender === 'bot') {
        designTopics.forEach(topic => {
            const regex = new RegExp(`\\b${topic}\\b`, 'gi');
            processedMessage = processedMessage.replace(regex, 
                `<span style="border-bottom: 1px dotted var(--accent);">$&</span>`
            );
        });
    }
    
    messageDiv.innerHTML = `<p>${processedMessage}</p>`;
    messagesContainer.appendChild(messageDiv);
    
    // Always scroll to bottom to show latest message
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 10);

    // Force layout recalculation to ensure proper rendering
    void messageDiv.offsetHeight;
}

// Add typing animation
function addTypingAnimation() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot typing';
    loadingDiv.innerHTML = '<span></span><span></span><span></span>';
    messagesContainer.appendChild(loadingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Remove typing animation
function removeTypingAnimation() {
    const loadingDiv = document.querySelector('.message.bot.typing');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// Check if we should collect email based on message content
function shouldCollectEmail(message) {
    const emailTriggerPhrases = [
        'quote', 'estimate', 'consultation', 'my home', 'my space', 
        'visit', 'appointment', 'meet', 'designer', 'help me with', 
        'my project', 'redesign', 'renovation', 'remodel', 'budget',
        'cost', 'price', 'how much', 'timeline', 'schedule', 'available'
    ];
    
    message = message.toLowerCase();
    
    // Check if message contains any trigger phrases
    return emailTriggerPhrases.some(phrase => message.includes(phrase));
}

// Validate email format
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Optimized API call function with timeouts and error handling
async function getChatResponse(history) {
    // If we're already processing a message, don't send another request
    if (isProcessingMessage) {
        console.log("Skipping API call - already processing a message");
        return "I'm still thinking about your previous question. Please wait a moment.";
    }
    
    isProcessingMessage = true;
    
    try {
        // Set a timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': window.location.href
            },
            signal: controller.signal,
            body: JSON.stringify({
                model: "openai/gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: `You are an AI assistant for Oakwood Interiors, a premium interior design company. Your name is Oakwood AI. Keep responses brief (under 100 words) and focused on interior design.`
                    },
                    ...history
                ],
                max_tokens: 300, // Reduced token count
                temperature: 0.7,
                top_p: 0.9,
                stream: false
            })
        });
        
        // Clear the timeout since the request completed
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
            throw new Error("Invalid response format from API");
        }
        
        return data.choices[0].message.content;
    } catch (error) {
        console.error("Error calling API:", error);
        return getDesignFallbackResponse();
    } finally {
        // Always reset the processing flag when done
        isProcessingMessage = false;
    }
}

// Fallback responses if API fails
function getDesignFallbackResponse() {
    const fallbackResponses = [
        "I'd be happy to discuss your interior design needs! Could you tell me more about the space you're looking to transform?",
        "Oakwood Interiors specializes in creating personalized spaces that reflect your style and personality. What type of room are you interested in redesigning?",
        "For your space, I'd recommend considering a balanced mix of textures and complementary colors. Would you like some specific suggestions for your project?",
        "The right lighting can transform any space. Consider layering different light sources - ambient, task, and accent lighting - to create depth and functionality.",
        "When planning your room layout, think about traffic flow and conversation areas. Would you like me to suggest some furniture arrangements?",
        "For small spaces, multifunctional furniture and strategic mirror placement can create an illusion of more space. What size is the area you're working with?",
        "Choosing a cohesive color palette is key to a harmonious design. I'd recommend starting with a neutral base and adding accent colors that reflect your personality.",
        "Quality over quantity is a good rule for interior design. Investing in a few statement pieces can elevate your entire space.",
        "Would you like to schedule a consultation with one of our design experts to discuss your project in detail?"
    ];
    
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
}

// Fix for iOS Safari 100vh issue
function handleMobileViewportHeight() {
    // Set a CSS variable with the actual viewport height
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    // Adjust chat box size when on mobile devices
    if (window.innerWidth <= 768) {
        chatbotBox.style.maxHeight = `calc(var(--vh, 1vh) * 70)`;
        messagesContainer.style.maxHeight = `calc(var(--vh, 1vh) * 50)`;
    } else {
        chatbotBox.style.maxHeight = '';
        messagesContainer.style.maxHeight = '';
    }
    
    // Make sure the messages container scrolls to bottom when resizing
    if (chatbotContainer.classList.contains('active')) {
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    }
}

// Adjust the chatbot when the mobile keyboard appears
function adjustForKeyboard() {
    if (window.innerWidth <= 768) {
        document.body.classList.add('keyboard-open');
        chatbotBox.style.bottom = '10px';
        chatbotBox.style.maxHeight = '50vh';
        
        // Scroll to the input field
        setTimeout(() => {
            userInput.scrollIntoView({ behavior: 'smooth' });
        }, 300);
    }
}

// Reset after keyboard closes
function resetAfterKeyboard() {
    if (window.innerWidth <= 768) {
        document.body.classList.remove('keyboard-open');
        chatbotBox.style.bottom = '';
        chatbotBox.style.maxHeight = '';
        
        // Ensure full redraw
        setTimeout(() => {
            handleMobileViewportHeight();
        }, 300);
    }
} 