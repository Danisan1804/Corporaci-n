<?php
session_start();

$configFile = __DIR__ . "/config.php";
if (!file_exists($configFile)) {
    http_response_code(500);
    exit("Configura primero config.php");
}

$config = require $configFile;

try {
    $pdo = new PDO(
        "mysql:host={$config["host"]};dbname={$config["db"]};charset={$config["charset"]}",
        $config["user"],
        $config["pass"],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ],
    );
} catch (Throwable $error) {
    http_response_code(500);
    exit("No se pudo conectar con la base de datos.");
}

$adminCount = (int) $pdo->query("SELECT COUNT(*) FROM admin_users")->fetchColumn();
$isFirstAdmin = $adminCount === 0;

if (!$isFirstAdmin && !isset($_SESSION["admin_id"])) {
    http_response_code(403);
    exit("Inicia sesión como administrador antes de crear otro acceso.");
}

$error = "";
$success = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $username = trim($_POST["username"] ?? "");
    $password = (string) ($_POST["password"] ?? "");

    if (strlen($username) < 4 || strlen($password) < 8) {
        $error = "El usuario debe tener mínimo 4 caracteres y la contraseña mínimo 8.";
    } else {
        try {
            $query = $pdo->prepare(
                "INSERT INTO admin_users(username,password_hash,created_at) VALUES(?,?,?)",
            );
            $query->execute([
                $username,
                password_hash($password, PASSWORD_DEFAULT),
                date("Y-m-d H:i:s"),
            ]);
            $success = "Administrador creado correctamente. Puedes cerrar esta página.";
        } catch (PDOException $exception) {
            $error = $exception->getCode() === "23000"
                ? "Ese nombre de usuario ya existe."
                : "No se pudo crear el administrador.";
        }
    }
}
?>
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Crear administrador LEL</title>
    <style>
      body { max-width: 460px; margin: 60px auto; padding: 24px; font-family: Arial, sans-serif; color: #102a43; }
      input, button { box-sizing: border-box; width: 100%; margin: 8px 0; padding: 12px; }
      button { border: 0; border-radius: 7px; background: #1976d2; color: white; cursor: pointer; font-weight: 700; }
      .error { color: #b42318; }
      .success { color: #087443; }
    </style>
  </head>
  <body>
    <h1>Crear administrador</h1>
    <p>Este acceso solo debe ser utilizado por el equipo autorizado de LEL.</p>
    <?php if ($error): ?>
      <p class="error"><?= htmlspecialchars($error) ?></p>
    <?php endif; ?>
    <?php if ($success): ?>
      <p class="success"><?= htmlspecialchars($success) ?></p>
    <?php else: ?>
      <form method="post">
        <input name="username" placeholder="Usuario" required />
        <input name="password" type="password" placeholder="Contraseña (mínimo 8 caracteres)" required />
        <button type="submit">Crear administrador</button>
      </form>
    <?php endif; ?>
  </body>
</html>
