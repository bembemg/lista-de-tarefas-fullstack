const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3333;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configuração do PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Função para criar a tabela se não existir
async function initializeDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                cost DECIMAL NOT NULL,
                limit_date TEXT NOT NULL,
                position INTEGER NOT NULL
            )
        `);
        console.log('Tabela tasks criada ou já existente');
    } catch (err) {
        console.error('Erro ao criar tabela:', err);
    }
}

// Inicializar banco de dados
initializeDatabase();

// Listar tarefas
app.get('/tasks', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tasks ORDER BY position ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Erro ao buscar tarefas!" });
    }
});

// Criar uma nova tarefa
app.post('/tasks', async (req, res) => {
    const { name, cost, limit_date } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO tasks (name, cost, limit_date, position) 
            VALUES ($1, $2, $3, (SELECT COALESCE(MAX(position), 0) + 1 FROM tasks)) 
            RETURNING id`,
            [name, cost, limit_date]
        );
        res.json({ id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: "Erro ao criar tarefa!" });
    }
});

// Reordenar tarefas
app.put('/tasks/reorder', async (req, res) => {
    const { tasks } = req.body;

    if (!tasks || !Array.isArray(tasks)) {
        return res.status(400).json({ error: "Formato inválido!" });
    }

    try {
        await pool.query('BEGIN');
        
        for (const task of tasks) {
            await pool.query(
                'UPDATE tasks SET position = $1 WHERE id = $2',
                [task.position, task.id]
            );
        }
        
        await pool.query('COMMIT');
        res.json({ message: "Tarefas reordenadas!" });
    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ error: "Erro ao reordenar tarefas!" });
    }
});

// Editar uma tarefa existente
app.put('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { name, cost, limit_date } = req.body;
    try {
        await pool.query(
            'UPDATE tasks SET name = $1, cost = $2, limit_date = $3 WHERE id = $4',
            [name, cost, limit_date, id]
        );
        res.json({ message: "Tarefa atualizada!" });
    } catch (err) {
        res.status(500).json({ error: "Erro ao atualizar tarefa!" });
    }
});

// Excluir uma tarefa
app.delete('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
        res.json({ message: "Tarefa deletada!" });
    } catch (err) {
        res.status(500).json({ error: "Erro ao deletar tarefa!" });
    }
});

// Iniciar o servidor
app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});