import React, { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import '../styles/App.css';

const API_URL = 'https://lista-de-tarefas-backend-gnvg.onrender.com';

function MainComponent() {

    useEffect(() => {
        fetchTasks();
    }, []);
    
    const fetchTasks = async () => {
        try {
            const response = await fetch(`${API_URL}/tasks`);
            const data = await response.json();
            setTask(data);
        } catch (error) {
            console.error("Erro ao buscar tarefas!", error);
        }
    }

    // Variáveis para criação de itens
    const [task, setTask] = useState([]);
    const [taskName, setTaskName] = useState('');
    const [expense, setExpense] = useState('');
    const [date, setDate] = useState('');
    // Variável para edição de item
    const [edit, setEdit] = useState(null);
    // Variável para exclusão de item
    const [itemToDelete, setItemToDelete] = useState(null);
    // Variável para mensagem de erro
    const [errorMessage, setErrorMessage] = useState('');
    const [errorClass, setErrorClass] = useState('');

    // Abrir dialog para adicionar item a lista
    const modal = useRef();
    const showModal = useCallback(() => {
        if (modal.current) {
            setTaskName('');
            setExpense('');
            setDate('');
            setEdit(null);
            modal.current.showModal();
        }
    }, []);
    const closeModal = useCallback(() => {
        if (modal.current) {
            modal.current.close();
        }
    }, []);
    
    const remove = useRef();
    const closeRemoveModal = useCallback(() => {
        if (remove.current) {
            setItemToDelete(null);
            remove.current.close();
        };
    }, []);

    const handleDragEnd = async (result) => {
        if (!result.destination) return;
    
        const items = Array.from(task);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
    
        const updatedList = items.map((item, index) => ({
            ...item,
            position: index + 1
        }));
    
        setTask(updatedList);
    
        try {
            const response = await fetch(`${API_URL}/tasks/reorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tasks: updatedList.map(item => ({
                        id: item.id,
                        position: item.position
                    }))
                })
            });
    
            if (!response.ok) {
                throw new Error("Erro ao reordenar tarefas!");
            }
        } catch (error) {
            console.error("Erro ao reordenar tarefas!", error);
            fetchTasks();
        }
    };

    // Mensagem de erro
    const showError = (message) => { 
        setErrorMessage(message); 
        setTimeout(() => { 
            setErrorClass('fade-in');
            setTimeout(() => { 
                setErrorClass('fade-out'); 
                setTimeout(() => {
                    setErrorMessage('');
                    setErrorClass('');
                    }, 1000);
                    }, 4000);
                }, 0);
            };

        
    // Adicionar Task
    const addTask = async () => {
        if (taskName.trim() !== '' && expense.trim() !== '' && date.trim() !== '') {
            // Verifica se já existe uma tarefa com o mesmo nome
            const tarefaExistente = task.some((item, index) => 
                // Ignora o item atual sendo editado
                index !== edit && item.name.toLowerCase() === taskName.trim().toLowerCase()
            );
    
            if (tarefaExistente) {
                showError('Já existe uma tarefa com esse nome.'); 
                return;
            }
    
            const newItem = {
                name: taskName,
                cost: parseFloat(expense.replace(/\./g, "").replace(",", ".")),
                limit_date: dayjs(date).format('DD/MM/YYYY')
            };

            try {
                if (edit !== null) {
                    await fetch(`${API_URL}/tasks/${task[edit].id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newItem)
                    });
                } else {
                    await fetch(`${API_URL}/tasks`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newItem)
                    });
                }

                fetchTasks();
                closeModal();
                setTaskName('');
                setExpense('');
                setDate('');
                setEdit(null);
            } catch (error) {
                console.error("Erro ao salvar tarefa!", error);
            };
        } else {
            showError('Preencha todos os campos antes de adicionar.'); 
            return;
        }
    };
    
    // ----------------------------------------
    
    const editExistingTask = useCallback((index) => {
        const tarefa = task[index];
        setTaskName(tarefa.name);
        
        // Verifica se a tarefa.expense é um número
        const expense = typeof tarefa.cost === 'number' ? tarefa.cost : 0;
        const formattedExpense = expense.toLocaleString('pt-br', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        setExpense(formattedExpense);

        const [dia, mes, ano] = tarefa.limit_date.split('/');
        const formattedDate = dayjs(`${ano}-${mes}-${dia}`).format('YYYY-MM-DD');
        setDate(formattedDate);
        
        setEdit(index);
        modal.current.showModal();
    }, [task]);  

    // Formata o valor de custo para BRL
    const formatBRL = (valor) => {
        return new Intl.NumberFormat('pt-br', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    };

    const handleExpenseChange = (event) => {
        let value = event.target.value;
        value = value.replace(/\D/g, ""); // Remove caracteres não numéricos.
        value = (value / 100).toFixed(2).replace(".", ","); // Converte para números com centavos.
        
        // Adiciona pontos a cada 3 caracteres após a vírgula.
        value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        
        setExpense(value);
    };
    
    // ----------------------------------------
    
    // Limita a quantia de caracteres no input de data limite
    const handleLimitDateChange = (event) => {
        let value = event.target.value;
        if (value.length <= 10) {
            setDate(value);
        };
    };

    // ----------------------------------------

    // Confirma se o usuário deseja excluir o item
    const deleteTask = async () => {
        if (itemToDelete !== null) {
            try {
                await fetch(`${API_URL}/tasks/${task[itemToDelete].id}`, {
                    method: 'DELETE'
                });
                fetchTasks();
                closeRemoveModal();
            } catch (error) {
                console.error("Erro ao deletar tarefa!", error);
            }
        }
    };

    // ----------------------------------------

    return (
        <main className="container">

            <div id="logo">
                <img className="logo-img" src={`${process.env.PUBLIC_URL}/assets/logo.svg`} alt="" />
            </div>

                <header className="tasks-header">
                    <span>Tarefa</span>
                    <span>Custo</span>
                    <span>Data Limite</span>
                </header>
            <section className="registers">

                
        {/* Lista ordenada -> */}

        <DragDropContext onDragEnd={handleDragEnd}>
    <Droppable droppableId="tasks">
        {(provided) => (
            <ol {...provided.droppableProps} ref={provided.innerRef}>
                {task.map((tarefa, index) => (
                    <Draggable 
                        key={tarefa.id} 
                        draggableId={tarefa.id.toString()} 
                        index={index}
                    >
                        {(provided) => (
                            <li
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                id="task-container"
                                className={tarefa.cost >= 1000 ? "expensive-task" : ""}
                            >
                                <div className="task">
                                    <p>{tarefa.name}</p>
                                </div>

                                <span className="task-expense">
                                    {formatBRL(tarefa.cost)}
                                </span>

                                <div className="date">
                                    <span>{tarefa.limit_date}</span>
                                </div>

                                <div className="buttons">
                                    <img 
                                        src={`${process.env.PUBLIC_URL}/assets/edit.svg`}
                                        className="edit-btn"
                                        alt="editar"
                                        onClick={() => editExistingTask(index)}
                                    />
                                    <img 
                                        src={`${process.env.PUBLIC_URL}/assets/remove.svg`}
                                        className="remove-btn"
                                        alt="remover"
                                        onClick={() => {
                                            setItemToDelete(index);
                                            remove.current?.showModal();
                                        }}
                                    />
                                </div>

                                <div {...provided.dragHandleProps} className='handle'>
                                    ☰
                                </div>
                            </li>
                        )}
                    </Draggable>
                ))}
                {provided.placeholder}
            </ol>
        )}
    </Droppable>
</DragDropContext>

        </section>

            {/* ------------------------------ */}

            {/* Botão de incluir item a lista de tarefas -> */}
            <div id="btn-container">
            <button id="btn-include" onClick={showModal}>Incluir</button>
            </div>

            {/* dialog para adicionar novo item a lista -> */}
            <dialog id="add" ref={modal}>

                <div className="dialog-header">
                <img src={`${process.env.PUBLIC_URL}/assets/remove.svg`} 
                className="cancel-btn" onClick={closeModal} alt="cancelar"/>
                <h2>{edit !== null ? "Salvar Tarefa" : "Adicionar Tarefa"}</h2>
                </div>

                <div className="add-dialog">
                <p>Nome da Tarefa</p>
                <input type="text" placeholder="Nome da Tarefa" className="add-task" 
                value={taskName}
                onChange={(event) =>
                    setTaskName(event.target.value)
                }/>

                <p>Custo</p>
                <input type="text" placeholder="R$ 0,00" className="add-expense"
                    value={expense}
                    onChange={handleExpenseChange}/>

                <p>Data Limite</p>
                <input type="date" className="add-date" maxLength="10"
                value={date}
                onChange={handleLimitDateChange}/>
                </div>

                {errorMessage && (
                    <div className={`error-message ${errorClass}`}>
                        {errorMessage}
                    </div>
                )}

                <button id="btn-add" onClick={addTask}>{edit !== null ? "Salvar" : "Adicionar"}</button>
            </dialog>

            {/* ------------------------------ */}

            {/* dialog de confirmação de exclusão de item */}
            <dialog id="remove" ref={remove}>
                <h2>Tem certeza que deseja excluir este item?</h2>

                <div id="remove-buttons">
                    <div className="remove-confirm" onClick={deleteTask}>
                        <p>Sim</p>
                        <img src={`${process.env.PUBLIC_URL}/assets/confirm.svg`} alt="confirmar"/>
                    </div>

                    <div className="remove-cancel" onClick={closeRemoveModal}>
                    <p>Não</p>
                    <img src={`${process.env.PUBLIC_URL}/assets/remove.svg`} alt="cancelar" />
                    </div>
                </div>
            </dialog>
    </main>
    );
};

export default MainComponent;