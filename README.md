

# 🎭 Mafia Game with AI & Voice Interactions 🎙️💬

Welcome to the **Mafia Game**! This project is a multiplayer **turn-based voice game** where human and AI players interact in real-time, powered by **AWS Bedrock, Polly, Transcribe, and Terraform**. 🕵️‍♂️🤖

Get ready to bluff, deduce, and have fun in this immersive **AI-driven game** where players take roles like **Mafia, Detective, and Mayor**, with conversations handled through **voice chat**! 🗣️✨

---

## 🛠️ Features

- **AI-Powered Roles** 🤖:
  - **Mafia Members**: Bluff and deceive your way to victory 🕶️
  - **Detective**: Gather clues and influence the game subtly 🔍
  - **Doctor**: Save lives during night phases 🏥
  - **Mayor**: Lead the discussion and break ties 🗳️
  - **Civilians**: Work together to find the Mafia and vote them out 👥

- **Turn-Based Voice Conversations** 🎙️:
  - Players take turns speaking, with **AI players responding in character** 🎭
  - Voice input converted to text using **AWS Transcribe** 📄
  - AI-generated responses with **Bedrock models** 🛠️

- **Scalable Infrastructure** 🚀:
  - **Containerized backend** using Docker 🐳
  - **Deployed on AWS ECS with Terraform** for fast, automated scaling 🌐
  - APIs for handling **speech-to-text and text-to-speech** interactions 🗣️🔄

---

## 🚀 Quick Start

1. **Clone the Repository** 📂:
   ```bash
   git clone https://github.com/yourusername/mafia-game.git
   cd mafia-game
   ```

2. **Set Up AWS Services** 🔧:
   - Ensure you have **AWS CLI** installed and configured 🌐
   - Create an **IAM role** for ECS task execution with necessary permissions 🛡️

3. **Build and Run Docker Locally** 🐳:
   ```bash
   docker build -t mafia-game .
   docker run -p 5000:5000 mafia-game
   ```

4. **Deploy with Terraform** 🚀:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

---

## 🎮 Game Flow

1. **Role Assignment** 📝:
   - Players are assigned roles secretly. 🤐
   - AI and human players don’t know each other’s identities. 👀

2. **Day Phase** ☀️:
   - Players discuss who they think the Mafia members are. 💬
   - Each player takes turns speaking, with AI players **blending in naturally**. 🤖

3. **Voting and Elimination** 🗳️:
   - Players vote to eliminate one player suspected of being Mafia. 🧑‍⚖️

4. **Night Phase** 🌙:
   - Mafia tries to eliminate a player. 😈
   - Doctor can save one player. 👨‍⚕️

5. **Win Conditions** 🎉:
   - **Mafia wins** if they outnumber the civilians. 🥳
   - **Civilians win** if they eliminate all Mafia members! 👏

---

## 📦 Project Structure

```bash
mafia-game/
├── app/
│   ├── server.py        # Backend logic for roles, voice input, and AI responses
│   ├── Dockerfile       # Docker configuration for containerization
│   └── requirements.txt # Dependencies for Python backend
├── terraform/
│   ├── main.tf          # Terraform config for AWS infrastructure
│   └── variables.tf     # Variables for AWS deployment
└── ui/
    └── index.html       # Minimal UI for voting and notes
```

---

## 🤖 AI and Voice Services

- **AWS Bedrock** 🛠️: Generates AI responses based on player roles and interactions.
- **AWS Polly** 🎙️: Converts text to speech with **natural-sounding voices**.
- **AWS Transcribe** 📄: Converts player speech to text for AI processing.

---

## 🛠️ Development Tips

1. **Use Postman** for API testing. 📬  
2. Monitor logs with **AWS CloudWatch**. 📊  
3. Secure endpoints with **IAM roles and tokens**. 🔒  
4. Enable auto-scaling for game sessions with ECS. 🚀  

---

## 🐛 Troubleshooting

- **Docker Issues** 🐳:  
  Run `docker system prune` to clean up unused containers and images.

- **Terraform Errors** 🛠️:  
  Make sure your AWS CLI is correctly configured with proper permissions.

- **Voice Services Not Responding** 🎙️:  
  Check API keys and **IAM roles** for AWS Polly and Transcribe services.

---

## 📜 License

This project is licensed under the **MIT License**. 📄

---

## 💬 Feedback and Contributions

Feel free to **fork** this repository and submit **pull requests**! 🛠️  
If you have any questions or feedback, open an **issue** or reach out via email. 📧

---

## ✨ Acknowledgements

Special thanks to **AWS** and the open-source community for the tools and resources that made this project possible. 🌐💙

---

Enjoy playing Mafia! 🎉🕵️‍♂️ Bluff, deceive, and deduce your way to victory! 🏆

---

