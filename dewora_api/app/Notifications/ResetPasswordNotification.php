<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    public string $token;
    public string $email;

    /**
     * Create a new notification instance.
     */
    public function __construct(string $token, string $email)
    {
        $this->token = $token;
        $this->email = $email;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        // URL trỏ đến trang reset password của frontend
        $resetUrl = 'http://127.0.0.1:5500/reset-password.html?token=' . $this->token . '&email=' . urlencode($this->email);
 $deworaLogoUrl = './public/dewora.png';
        return (new MailMessage)
                    ->subject('Yêu cầu đặt lại mật khẩu cho tài khoản ' . config('app.name'))
                    ->greeting('Chào bạn,')
                    ->line('Bạn nhận được email này vì chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.')
                    ->action('Đặt lại mật khẩu', $resetUrl)
                    ->line('Liên kết này sẽ hết hạn sau 60 phút.')
                    ->line('Nếu bạn không yêu cầu đặt lại mật khẩu, bạn không cần thực hiện thêm hành động nào.')
                    ->salutation('Trân trọng,');
    }
}