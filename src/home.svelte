<script>
    import Trabajadores from "./trabajadores.svelte";
    import Horario from "./horario.svelte"; 
    import Prueba from "./servicio.svelte";    

    let menu = sessionStorage.getItem("menu"); 

    function Menu(select_menu) {   
        sessionStorage.setItem("menu", select_menu);
        menu = select_menu; 
    };
  
    function Close() {            
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("menu");            
        location.href = location.href;
    };
</script>
    
<div class="container">    
    <div class="sidebar">       
        <button on:click={() => Menu("1")}>  
            <img src="Reporte.svg" height="50" alt="">     
        </button>
        <button on:click={() => Menu("2")}>
            <img src="Servicio.svg" height="50" alt="">           
        </button>
        <button on:click={() => Menu("3")}>             
            <img src="Horario.svg" height="50" alt="">      
        </button>
        <button on:click={() => Menu("4")}>
            <img src="Salud.svg" height="50" alt="">            
        </button>
        <button on:click={() => Menu("5")}>
            <img src="Personal.svg"  height="50" alt="">               
        </button>
        <button on:click={Close}>
            <img src="Salir.svg" height="50" alt="">                
        </button>        
    </div>

    <div>
        {#if menu === "1"}           
            <p>Menu 1</p>
        {:else if menu === "2"}
            <Prueba />
        {:else if menu === "3"}
            <Horario />
        {:else if menu === "4"}
            <p>Menu 4</p>
        {:else if menu === "5"}
            <Trabajadores />
        {/if}     
    </div>      
</div>

<style>
    .container {
        width: 100%;
        max-width: 1400px; 
        min-width: 320px;
        display: grid;
        grid-template-columns: 1fr;
        margin: 0 auto;
    }

    .sidebar {        
        display: flex;
        flex-direction: row;
        justify-content: space-around;     
        background-color: #38d39f;        
    }
        
    button {
        background-color: #80cfb5;
        border: none;        
        cursor: pointer;
        outline: none;       
        border-radius: 10px;  
        transition: 0.4s all;     
    }    

    button img {
        margin-top: 3px;
    }
 
    button:hover {         
        background-color: #dbe9e1;          
    }  

    button:active {
        transform: scale(0.8);
    }    

    @media screen and (min-width: 460px){
        .container {
            grid-template-columns: 80px 1fr;       
        }

        .sidebar {
            flex-direction: column;   
            justify-content: start; 
            gap: 30px;                    
        }     
        
        button {          
            margin: 0 6px;
        }

        img {
            height: 64px;
        }
    }    
</style>