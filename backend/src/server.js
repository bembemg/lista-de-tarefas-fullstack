const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3333;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Banco de dados SQLite
const db = new sqlite3.Database('./src/tasks.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados!', err);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

// Criação da tabela, se não existir
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            cost REAL NOT NULL,
            limit_date TEXT NOT NULL,
            position INTEGER NOT NULL
            )
            `);
        });

        // Listar tarefas
        app.get('/tasks', (req, res) => {
            db.all("SELECT * FROM tasks ORDER BY position ASC", (err, rows) => {
                if (err) {
            res.status(500).json({ error: "Erro ao buscar tarefas!" });
        } else {
            res.json(rows);
        }
    });
});

// Criar uma nova tarefa
app.post('/tasks', (req, res) => {
    const { name, cost, limit_date } = req.body;
    db.run(
        `INSERT INTO tasks (name, cost, limit_date, position) VALUES (?, ?, ?, (SELECT IFNULL(MAX(position), 0) + 1 FROM tasks))`,
        [name, cost, limit_date],
        function(err) {
            if (err) {
                res.status(500).json({ error: "Erro ao criar tarefa!" });
            } else {
                res.json({ id: this.lastID });
            }
        }
    );
});

// Reordenar tarefas
app.put('/tasks/reorder', (req, res) => {
    // console.log('Recebendo requisição de reordenação');
    const { tasks } = req.body;
    // console.log('Reordenação recebida:', tasks);

    if (!tasks || !Array.isArray(tasks)) {
        return res.status(400).json({ error: "Formato inválido!" });
    }

    const stmt = db.prepare("UPDATE tasks SET position = ? WHERE id = ?");
    tasks.forEach((task) => {
        stmt.run(task.position, task.id);
    });
    stmt.finalize((err) => {
        if (err) {
            res.status(500).json({ error: "Erro ao reordenar tarefas!" });
        } else {
            res.json({ message: "Tarefas reordenadas!" });
        }
    });
});

// Editar uma tarefa existente
app.put('/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { name, cost, limit_date } = req.body;
    db.run(
        `UPDATE tasks SET name = ?, cost = ?, limit_date = ? WHERE id = ?`,
        [name, cost, limit_date, id],
        (err) => {
            if (err) {
                res.status(500).json({ error: "Erro ao atualizar tarefa!" });
            } else {
                res.json({ message: "Tarefa atualizada!" });
            }
        }
    );
});

// Excluir uma tarefa
app.delete('/tasks/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM tasks WHERE id = ?`, id, (err) => {
        if (err) {
            res.status(500).json({ error: "Erro ao deletar tarefa!" });
        } else {
            res.json({ message: "Tarefa deletada!" });
        }
    });
});

// Iniciar o servidor
app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});