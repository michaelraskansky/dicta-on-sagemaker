# Demo Script: Customer Support Agent - Prototype to Production

## Demo Overview (5 mins)
**Opening Hook:** "Let's build a customer support agent and take it from 'works on my laptop' to 'serves thousands of customers in production' - all in 90 minutes."

### Show Final Architecture First
- Open `images/architecture_lab5_streamlit.png`
- "This is where we're going - from a simple local script to a full production system"
- Point out the evolution: Local → Memory → Shared Tools → Production → Web App

---

## Demo 1: Basic Agent (15 mins)

### Setup (2 mins)
```bash
cd /Users/michrask/Dev/genai-loft-demo-session31
code demo_01_basic_agent.py
```

### Key Points to Highlight:
1. **Simple Start** - "Every production system starts simple"
2. **Local Tools** - Show the 4 basic functions
3. **Strands Agents Framework** - "Code-first, simple to understand"
4. **Bedrock Integration** - Claude 3.7 Sonnet

### Live Demo Flow:
1. Walk through the tool functions (2 mins)
2. Show agent creation (2 mins)
3. Run the demo - show 3 test questions (5 mins)
4. **Problem Statement**: "This works great... for one user, on my machine, with no memory" (1 min)

### Transition:
"Real customer support needs memory. Let's fix that."

---

## Demo 2: Adding Memory (20 mins)

### Setup (1 min)
```bash
code demo_02_agent_with_memory.py
```

### Key Points:
1. **AgentCore Memory** - "Managed service for persistent memory"
2. **Customer Context** - "Remember across sessions"
3. **Personalization** - "Learn preferences over time"

### Live Demo Flow:
1. Show memory configuration (3 mins)
2. Run first conversation (5 mins)
3. **Key Moment**: Start new session with same customer_id (5 mins)
4. Show how agent remembers previous conversation (5 mins)

### Audience Interaction:
"What other memory capabilities would you want?" (1 min)

### Transition:
"Memory is great, but we're still running locally. Production needs shared tools."

---

## Demo 3: Shared Tools (25 mins)

### Setup (2 mins)
```bash
code demo_03_shared_tools.py
```

### Key Points:
1. **Enterprise Reality** - "Tools need to be shared across teams"
2. **AgentCore Gateway** - "Centralized tool management"
3. **Security** - "JWT authentication, proper access control"
4. **Lambda Integration** - "Use existing enterprise functions"

### Live Demo Flow:
1. Show gateway configuration (5 mins)
2. Explain tool sharing benefits (5 mins)
3. Run enterprise scenarios (8 mins)
4. Highlight security and scalability (5 mins)

### Discussion Point:
"How many of you have tools that multiple teams need to use?" (Show of hands)

### Transition:
"Shared tools are great, but we're still not production-ready. Let's deploy this properly."

---

## Demo 4: Production Deployment (20 mins)

### Setup (1 min)
```bash
code demos/demo_04_production_agent.py
```

### Key Points:
1. **The Magic** - "Only 4 lines transform Demo 3 to production"
2. **AgentCore Runtime** - "Fully managed deployment"
3. **Two Modes** - "Deploy AND interact with production agent"
4. **Live Commands** - "Real deployment in front of audience"
5. **Observability** - "Automatic CloudWatch integration"

### Live Demo Flow:
1. **Show Demo 4 file** - Compare with Demo 3 (3 mins)
   - "Same agent logic, just 4 lines added"
   - Point out BedrockAgentCoreApp wrapper
   - Highlight dual mode: deployment vs interactive
   
2. **Live deployment** - Run commands in terminal (5 mins)
   ```bash
   agentcore configure --entrypoint demos/demo_04_production_agent.py --name demo4_production --non-interactive
   agentcore launch
   ```
   
3. **Interactive Mode** - Chat with deployed agent (8 mins)
   ```bash
   uv run demos/demo_04_production_agent.py
   ```
   - "Now let's talk to our production agent"
   - Show 2-3 messages going to AWS
   - Highlight streaming responses
   - Use `/status` to show session info
   - **Key Point**: "Every message you see is going to AWS and back"
   
4. **Show observability** - Point to CloudWatch locations (2 mins)
5. **Highlight production benefits** (2 mins)

### Key Moment:
**"Watch this - Demo 3 becomes production-ready with just 4 lines, AND we can chat with it interactively!"**

### Audience Interaction:
"What's the biggest challenge moving your prototypes to production?" 

### Transition:
"We can chat with our production agent from the terminal, but customers need a proper web interface."

---

## Demo 5: Web Interface (15 mins)

### Setup (2 mins)
```bash
code demo_05_web_interface.py
# If time permits: streamlit run demo_05_web_interface.py
```

### Key Points:
1. **Customer Experience** - "What customers actually see"
2. **Real-time Chat** - "Streaming responses"
3. **Authentication** - "Secure customer sessions"
4. **Production Integration** - "Connects to AgentCore Runtime"

### Live Demo Flow:
1. Show Streamlit interface code (5 mins)
2. If running live: demonstrate the chat (5 mins)
3. Highlight customer experience features (3 mins)

### Alternative if not running live:
Show screenshots and walk through the user experience

---

## Wrap-up & Q&A (10 mins)

### Key Takeaways:
1. **Journey Matters** - "Start simple, evolve systematically"
2. **AgentCore Value** - "Handles the production complexity for you"
3. **Framework Agnostic** - "Use any framework, any model"
4. **Real Production** - "This architecture serves real customers"

### Architecture Evolution Recap:
- Demo 1: Local prototype
- Demo 2: + Memory
- Demo 3: + Shared tools  
- Demo 4: + Production deployment
- Demo 5: + Customer interface

### Questions to Prompt Discussion:
1. "What's the biggest challenge you face moving AI prototypes to production?"
2. "How do you handle memory and context in your current agents?"
3. "What would you build with this architecture?"

---

## Technical Notes for Presenter:

### If Code Doesn't Run:
- Focus on explaining the concepts
- Use the code as documentation
- "In a real demo environment, you'd see..."

### Time Management:
- **Running ahead**: Add more discussion, dive deeper into code
- **Running behind**: Skip running code, focus on concepts
- **Way behind**: Jump to Demo 4 & 5, show the end result

### Audience Engagement:
- Ask about their current agent architectures
- Get show of hands on pain points
- Encourage questions throughout

### Demo Environment Prep:
- Have all files open in VS Code tabs
- Test internet connectivity for any live components
- Have backup screenshots ready
- Ensure AWS credentials are configured
