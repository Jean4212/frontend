<script>
    import Trabajadores from "./trabajadores.svelte";
    import Horario from "./horario.svelte";   
    import Cookies from "js-cookie";
  
    let Menu = sessionStorage.getItem("menu"); 

    function showMenu(menuId) {   
        sessionStorage.setItem("menu", menuId);
        Menu = sessionStorage.getItem("menu"); 
    };
  
    function deleteCookies() {    
        let user = Cookies.get("login");
        Cookies.remove("login");   
        sessionStorage.removeItem(user);
        sessionStorage.removeItem("menu");
            
        location.href = location.href;
    };
</script>
    
<div class="container">    
    <div class="sidebar">       
        <button class="item item1" on:click={() => showMenu("1")}>  
            <img src="Reporte.svg" height="50" alt="">     
        </button>
        <button class="item" on:click={() => showMenu("2")}>
            <img src="Servicio.svg" height="50" alt="">           
        </button>
        <button class="item" on:click={() => showMenu("3")}>             
            <img src="Horario.svg" height="50" alt="">      
        </button>
        <button class="item" on:click={() => showMenu("4")}>
            <img src="Salud.svg" height="50" alt="">            
        </button>
        <button class="item" on:click={() => showMenu("5")}>
            <img src="Personal.svg"  height="50" alt="">               
        </button>
        <button class="item close" on:click={deleteCookies}>
            <img src="Salir.svg" height="50" alt="">                
        </button>        
    </div>

    <div class="panel">
        {#if Menu === "1"}           
            <p>Menu 1</p>

        {:else if Menu === "2"}
            <p>Menu 2</p>

        {:else if Menu === "3"}
            <Horario />

        {:else if Menu === "4"}
            <p>Menu 4</p>

        {:else if Menu === "5"}
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
        background-color: #e6eef0;  
    }
        
    .item {
        background-color: #f2f6f8;
        border: none;        
        cursor: pointer;
        outline: none;
        transition: transform 0.3s ease-in-out; 
        border-radius: 10px;
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
        
        .item {
            padding-top: 7px;
            padding-bottom: 2px;
            margin-left: 6px;
            margin-right: 6px;
        }

        .item1 {
            margin-top: 6px;
        }
       
        .item:hover {         
            transform: scale(1.1);              
        }         

        .close {
            margin-bottom: 6px;
        }
    }    
</style>