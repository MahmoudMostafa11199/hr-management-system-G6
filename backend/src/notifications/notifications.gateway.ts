import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { parseCookie } from 'cookie';

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(socket: Socket) {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        socket.disconnect();
        return;
      }

      const cookies = parseCookie(cookieHeader as string);
      const token = cookies['token'];
      if (!token) {
        socket.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      socket.join(`user:${payload.sub}`);

      //
    } catch (err) {
      socket.disconnect();
      console.error(err);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleDisconnect(socket: Socket) {
    // socket.io بيتعامل مع الخروج من الـ rooms تلقائيًا عند الـ disconnect
  }
}
