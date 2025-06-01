<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
// use Illuminate\Auth\Notifications\ResetPassword; // Dòng này có thể có hoặc không
// use Illuminate\Support\Facades\Gate; // Dòng này có thể có hoặc không

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        // 'App\Models\Model' => 'App\Policies\ModelPolicy',
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        // ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
        //     return url('/reset-password/'.$token.'?email='.$notifiable->getEmailForPasswordReset());
        // });
    }
}
