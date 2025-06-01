<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class IsAdminMiddleware
   {
public function handle(Request $request, Closure $next)
{
if (Auth::check() && Auth::user()->is_admin) {
return $next($request);
}
return response()->json(['message' => 'Unauthorized. Administrator access required.'], 403);
}
}