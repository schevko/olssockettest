require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();
app.use(cors());
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

const port = process.env.PORT ?? 3010;

io.on("connection", (socket) => {
  socket.on("join", (data) => {
    const { chatId, user } = data;
    socket.join(`chat_${chatId}`);
  });

  socket.on("leave", (data) => {
    const { chatId, user } = data;
    socket.leave(`chat_${chatId}`);
  });

  socket.on("writing", (data) => {
    const { chatId, user, sender_id, receiver_id } = data;
    socket.to(`chat_${chatId}`).emit("writing", {
      user,
      chatId,
      sender_id,
      receiver_id,
    });
  });

  // Mesaj gönderme işlemi
  socket.on("sendMessage", async (data) => {
    const { chatId, message, senderId, receiver_id, token, sender_data } = data;

    try {
      // Mesajı kaydet
      const send_message = await axios.post(
        `${process.env.BASE_URL ?? "http://localhost:8000"}/api/v1/message/save`,
        {
          receiver_id: receiver_id,
          content: message,
          type: "text",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Mesajı belirtilen sohbete yayınla
      io.to(`chat_${chatId}`).emit("message", {
        data: send_message.data,
        sender_id: senderId,
        message,
        receiver_id: receiver_id,
        sender_data,
      });
    } catch (error) {
      console.error("Mesaj gönderme hatası:", error);
      socket.emit("error", { message: "Mesaj gönderilemedi." });
    }
  });
});

server.listen(port, () => {
  console.log(`Socket.io sunucusu ${port} portunda çalışıyor.`);
});
