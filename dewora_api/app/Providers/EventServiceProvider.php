<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Event; // Đảm bảo dòng này có
// use App\Events\SomeEvent; // Ví dụ về một event tùy chỉnh
// use App\Listeners\SomeListener; // Ví dụ về một listener tùy chỉnh

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        // SomeEvent::class => [
        //     SomeListener::class,
        // ],
    ];

    /**
     * Register any events for your application.
     */
    public function boot(): void
    {
        //
    }

    /**
     * Determine if events and listeners should be automatically discovered.
     */
    public function shouldDiscoverEvents(): bool
    {
        return false; // Mặc định là false
    }
}