<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;
use Illuminate\Auth\AuthenticationException; // <-- Make sure this is imported

class Handler extends ExceptionHandler
{
    /**
     * A list of the exception types that are not reported.
     *
     * @var array<int, class-string<Throwable>>
     */
    protected $dontReport = [
        // \Illuminate\Auth\AuthenticationException::class,
        // \Illuminate\Auth\Access\AuthorizationException::class,
        // \Symfony\Component\HttpKernel\Exception\HttpException::class,
        // \Illuminate\Database\Eloquent\ModelNotFoundException::class,
        // \Illuminate\Session\TokenMismatchException::class,
        // \Illuminate\Validation\ValidationException::class,
    ];

    /**
     * A list of the inputs that are never flashed for validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            // You can add custom reporting logic here
            // For example, send errors to an external service like Sentry or Flare
        });

        // You might have other reportable or renderable closures here.
    }

    /**
     * Convert an authentication exception into a response.
     *
     * This is the method you'll want to customize for API authentication issues.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Illuminate\Auth\AuthenticationException  $exception
     * @return \Symfony\Component\HttpFoundation\Response
     */
    protected function unauthenticated($request, AuthenticationException $exception)
    {
        // Check if the request expects JSON (e.g., AJAX, API call)
        // or if the route is part of the 'api' middleware group or has 'api' in its URI.
        if ($request->expectsJson() || $request->is('api/*') || collect($request->route()?->middleware() ?? [])->contains('api')) {
            return response()->json(
                ['message' => $exception->getMessage() ?: 'Unauthenticated.'], // Use exception message or default
                401
            );
        }

        // For web requests, redirect to the login page specified by the guard or a default.
        // The redirectTo() method on the exception can provide guard-specific redirects.
        $redirectTo = $exception->redirectTo();
        if ($redirectTo) {
            return redirect()->guest($redirectTo);
        }

        // Fallback for guards without a specific redirectTo, or if route('login') is intended for web.
        // Ensure you have a 'login' named route if you use route('login') here for web guards.
        // For a pure API setup without web routes, this part might not be hit often if expectsJson() is reliable.
        // If it is hit, and 'login' route doesn't exist, it will cause a "Route [login] not defined." error.
        // Consider a generic fallback if no web login route is defined.
        try {
            return redirect()->guest(route('login'));
        } catch (\Symfony\Component\Routing\Exception\RouteNotFoundException $e) {
            // If 'login' route is not defined (e.g., pure API application),
            // return a generic response or redirect to a safe fallback for web.
            // For an API context that somehow didn't trigger expectsJson(), this is a last resort.
            return response('Unauthenticated (and no login route configured).', 401);
        }
    }

    /**
     * Render an exception into an HTTP response.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Throwable  $exception
     * @return \Symfony\Component\HttpFoundation\Response
     *
     * @throws \Throwable
     */
    public function render($request, Throwable $exception)
    {
        // You can add custom rendering logic here for specific exception types
        // if needed, before falling back to the parent::render method.

        // Example: Custom handling for a specific exception
        // if ($exception instanceof \App\Exceptions\CustomApiException) {
        //     return response()->json(['error' => $exception->getMessage()], $exception->getCode() ?: 400);
        // }

        return parent::render($request, $exception);
    }
}