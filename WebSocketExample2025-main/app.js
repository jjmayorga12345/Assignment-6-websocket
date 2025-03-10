require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const OpenAI = require("openai");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const users = new Set();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("User connected.");

    socket.on("chat message", async (msgData) => {
        console.log(`Message from ${msgData.user}: ${msgData.text}`);

        if (msgData.text.toLowerCase().includes("@bot")) {
            const botResponse = await getChatGPTResponse(msgData.text);
            io.emit("chat message", { user: "Bot", text: botResponse });
        } else {
            io.emit("chat message", msgData);
        }
    });

    socket.on("set username", (username) => {
        socket.username = username;
        users.add(username);
        io.emit("user list", Array.from(users));
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        users.delete(socket.username);
        io.emit("user list", Array.from(users));
    });
});

async function getChatGPTResponse(userMessage) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: userMessage }]
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error("OpenAI API error:", error);
        return "AI response failed.";
    }
}

server.listen(3000, () => {
    console.log("Server running on port 3000");
});
