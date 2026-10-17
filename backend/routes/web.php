<?php

use Illuminate\Support\Facades\Route;

// El backend es solo una API. El frontend vive en /frontend y se sirve aparte.
Route::get('/', function () {
    return response()->json([
        'app' => config('app.name'),
        'mensaje' => 'BiblioTech API. Los endpoints están bajo /api.',
    ]);
});
