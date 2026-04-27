<?php
declare(strict_types=1);

/**
 * MySQLi-like API implemented on top of PDO for incremental migration to PDO
 * (same surface area the project actually uses: query/prepare, transactions, num_rows, etc.)
 */
final class PdoMysqliShim
{
    public int $errno = 0;

    public string $error = '';

    public int $affected_rows = 0;

    public int $insert_id = 0;

    public function __construct(private PDO $pdo) {}

    public function getPdo(): PDO
    {
        return $this->pdo;
    }

    public function set_charset(string $charset): bool
    {
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $charset)) {
            return false;
        }
        $this->pdo->exec('SET NAMES ' . $charset);

        return true;
    }

    public function real_escape_string(string $str): string
    {
        $q = $this->pdo->quote($str);
        return substr($q, 1, -1);
    }

    public function begin_transaction(int $flags = 0, string $name = ''): bool
    {
        return $this->pdo->beginTransaction();
    }

    public function commit(int $flags = 0, string $name = ''): bool
    {
        return $this->pdo->commit();
    }

    public function rollback(int $flags = 0, string $name = ''): bool
    {
        return $this->pdo->rollBack();
    }

    public function select_db(string $name): bool
    {
        $this->clearErr();
        $n = $this->pdo->exec('USE ' . $this->quoteIdentifier($name));
        if ($n === false) {
            $this->syncConnError();
            return false;
        }
        return true;
    }

    public function query(string $sql, int $resultmode = 0)
    {
        $this->clearErr();
        $this->affected_rows = 0;
        $this->insert_id = 0;
        $st = $this->pdo->query($sql);
        if ($st === false) {
            $this->syncConnError();
            return false;
        }
        if ($st->columnCount() > 0) {
            $rows = $st->fetchAll(PDO::FETCH_ASSOC);
            return new PdoMysqliResult($rows);
        }
        $this->affected_rows = $st->rowCount();
        $this->insert_id = (int) $this->pdo->lastInsertId();
        return true;
    }

    public function prepare(string $sql)
    {
        $this->clearErr();
        $st = $this->pdo->prepare($sql);
        if ($st === false) {
            $this->syncConnError();
            return false;
        }
        return new PdoMysqliStmt($this, $st);
    }

    private function clearErr(): void
    {
        $this->errno = 0;
        $this->error = '';
    }

    private function syncConnError(): void
    {
        $e = $this->pdo->errorInfo();
        $this->errno = (int) ($e[1] ?? 0);
        $this->error = (string) ($e[2] ?? '');
    }

    private function quoteIdentifier(string $s): string
    {
        return '`' . str_replace('`', '``', $s) . '`';
    }
}

final class PdoMysqliResult
{
    public int $num_rows;

    /** @var list<array<string, mixed>> */
    private array $rows;

    private int $i = 0;

    public function __construct(array $rows)
    {
        $this->rows = $rows;
        $this->num_rows = count($rows);
    }

    public function fetch_assoc(): array|false
    {
        if ($this->i >= count($this->rows)) {
            return false;
        }
        $row = $this->rows[$this->i];
        $this->i++;
        return $row;
    }

    public function free(): void
    {
        $this->rows = [];
        $this->i = 0;
        $this->num_rows = 0;
    }
}

final class PdoMysqliStmt
{
    public string $error = '';

    public int $errno = 0;

    public int $affected_rows = 0;

    public int $insert_id = 0;

    private string $types = '';

    /** @var array<int, mixed> */
    private $bound = [];

    public function __construct(
        private PdoMysqliShim $shim,
        private ?PDOStatement $st,
    ) {}

    public function bind_param(string $types, &...$args): bool
    {
        $this->types = $types;
        $this->bound = [];
        for ($i = 0, $c = count($args); $i < $c; $i++) {
            $this->bound[] = &$args[$i];
        }
        return true;
    }

    public function execute(): bool
    {
        $this->error = '';
        $this->errno = 0;
        if ($this->st === null) {
            return false;
        }
        $n = strlen($this->types);
        $params = [];
        for ($i = 0; $i < $n; $i++) {
            $t = $this->types[$i] ?? 's';
            if (!array_key_exists($i, $this->bound)) {
                $params[] = null;
                continue;
            }
            $params[] = $this->coerceParam($t, $this->bound[$i]);
        }
        $ok = $this->st->execute($params);
        if (!$ok) {
            $e = $this->st->errorInfo();
            $this->errno = (int) ($e[1] ?? 0);
            $this->error = (string) ($e[2] ?? '');

            return false;
        }
        $this->affected_rows = $this->st->rowCount();
        $this->shim->affected_rows = $this->affected_rows;
        $iid = (int) $this->shim->getPdo()->lastInsertId();
        $this->insert_id = $iid;
        $this->shim->insert_id = $iid;

        return true;
    }

    public function get_result()
    {
        if ($this->st === null) {
            return false;
        }
        if ($this->st->columnCount() === 0) {
            return false;
        }
        $rows = $this->st->fetchAll(PDO::FETCH_ASSOC);

        return new PdoMysqliResult($rows);
    }

    public function close(): void
    {
        $this->st = null;
    }

    private function coerceParam(string $t, mixed $v): mixed
    {
        return match ($t) {
            'i' => (int) $v,
            'd' => (float) $v,
            'b' => $v,
            default => (string) $v,
        };
    }
}
