<script>    
    let lista = [];
    let currentPage = 0;
    let itemsPerPage = 20;
    let showPage = [];

    const url = "http://localhost:8000/persons"; 

    let fetchPromise = fetch(url)
        .then(response => response.json())
        .then(persons => {
            lista = [...persons];        
            totalPages = Math.ceil(lista.length / itemsPerPage);     
            showPage = lista.slice(currentPage, itemsPerPage);            
        });     

    let activePage = 0;
    let totalPages = 0;
   
    function getCurrentPageItems(page) {

        currentPage = page;

        const startIndex = currentPage * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;

        showPage = lista.slice(startIndex, endIndex);
        activePage = page;

        for (let i = 1; i <= totalPages; i++) {
            let name = "btn" + (i - 1);
            const elemento = document.getElementById(name);
            elemento.classList.remove("active");
            console.log(i-1);
        };

        let btn_activo = "btn" + page;
        const activo = document.getElementById(btn_activo);
        activo.classList.add("active");  
    }  
</script>

<div class="container">
    <h2>Personal</h2>   
   
    {#await fetchPromise}
        <p>Cargando datos...</p>
    {:then}
        <table>
            <thead>
                <tr>
                    <th>#</th>                
                    <th>NOMBRE</th>
                    <th>DNI</th>                
                    <th>INGRESO</th>
                    <th>CARGO</th>
                    <th>GESTION</th>               
                </tr>
            </thead>
            <tbody>
                {#each showPage as person, index}
                    <tr>
                        <th>{currentPage * itemsPerPage + index + 1}</th>                    
                        <td>{person.paterno} {person.materno} {person.nombre}</td>
                        <td>{person.dni}</td>                    
                        <td>{person.ingreso}</td>
                        <td>{person.cargo}</td>
                        <td>
                            <div class="menu">
                                <button class="options">
                                    <img src="Mas.svg"  height="21" alt="">  
                                </button>
                                <button class="delete">
                                    <img src="Del.svg"  height="21" alt="">    
                                </button>
                            </div>                        
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
        
        <nav class="pagination">       
            {#each Array.from({ length: totalPages }) as _, i}               
                <button class:active={i === 0} class="page" id="btn{i}" on:click={() => getCurrentPageItems(i)}>{i + 1}</button>               
            {/each} 
        </nav>
    {/await}    
</div>

<style>
    .container {      
        padding: 5px;
        display: flex;
        flex-direction: column; 
    }

    table {
        border-collapse: collapse; 
    }

    th, td {       
        border: 2px solid #ffff;
    }   
    
    table thead {
        background-color: #bcdff3;        
    }

    table tbody {
        background-color: #f7f9fa;       
    }
     
    table td:nth-child(3),
    table th:nth-child(3),
    table td:nth-child(4),
    table th:nth-child(4) {        
        text-align: center;
    }

    .menu  {        
        display: flex;
        flex-direction: row;
        justify-content: center;       
        gap: 10px;     
    }

    .options, .delete {  
        width: 21px;
        height: 21px;             
        cursor: pointer;
        border: none;
        background-color: transparent;    
        transition: transform 0.3s ease-in-out;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .pagination {   
        margin-top: 15px;     
        display: flex;
        flex-direction: row;        
        justify-content: center;   
        gap: 2px;          
    }
   
    .page {
        font-size: 15px;
        width: 20px;
        cursor: pointer;        
    }
   
    .active {       
        font-weight: bold;
        transform: scale(1.1);  
    }

    @media screen and (min-width: 460px) {
        .options:hover, .delete:hover {    
            transform: scale(1.1);
        }

        tbody tr:hover {
            background-color: #d0dff0;
        } 
    }
      
    @media screen and (max-width: 600px) {
        table td:nth-child(3),
        table th:nth-child(3) {
            display: none;
        }
    }  

    @media screen and (max-width: 700px) {
        table td:nth-child(4),
        table th:nth-child(4) {
            display: none;
        }
    }   
    
    @media screen and (max-width: 1000px) {
        table td:nth-child(5),
        table th:nth-child(5) {
            display: none;
        }        
    }  
</style>