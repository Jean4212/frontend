<script>
    const color = ["#F70B04", "#1D3ACB", "#13BD08", "#08C3F1", "#F19D08", "#F604D1"]; 
    let horario = [];    

    const token = sessionStorage.getItem("token");
    const headers = {Authorization: "Bearer " + token};
    const url = "https://api-jeanoi4212.b4a.run/select/cars"; 

    let fetchPromise = fetch(url, {headers})
        .then(response => response.json())
        .then(persons => {
            console.log(persons)
            horario = [...persons];
        }); 
</script>
      
<div class="container">
    <h2>Horario</h2>
   
    {#await fetchPromise}
        <p>Cargando datos...</p>
    {:then} 

        {#each horario as h}

            <p><strong>{h.unidad}</strong></p> 
            
            {#each h.trabajadores as t, index} 
                <p><strong style="color: {color[index]};">{t.slice(0, 1)}</strong>{t.slice(1, )}</p>         
            {/each}  

            <table>
                <thead>
                    <tr>      
                        {#each h.dia as _, index}
                            <th>{index + 1}</th>
                        {/each} 
                    </tr>
                </thead>

                <tbody>                     
                    <tr>                           
                        {#each h.dia as dia} 

                            {#if typeof dia === "number"}
                                <td>
                                    <strong style="color: {color[dia]};">                                   
                                        {h.trabajadores[dia].slice(0, 1)}                                      
                                    </strong>
                                </td>   
                            {/if}  

                            {#if typeof dia === "string"}
                                {#if dia}
                                    <td>
                                        <div class="tooltip" data-tooltip={dia}>
                                            <strong style="color: #DFE3E4;">&#10004</strong>
                                        </div>                                
                                    </td>
                                {:else}
                                    <td>
                                        <strong style="color: #DFE3E4;">&#10007</strong>                              
                                    </td>   
                                {/if}                                
                            {/if}             
                        {/each} 
                    </tr>  
                    <tr>                            
                        {#each h.noche as noche} 

                            {#if typeof noche === "number"}
                                <td>
                                    <strong style="color: {color[noche]};">                                   
                                        {h.trabajadores[noche].slice(0, 1)}                                      
                                    </strong>
                                </td>   
                            {/if}  

                            {#if typeof noche === "string"}
                                {#if noche}
                                    <td>
                                        <div class="tooltip" data-tooltip={noche}>
                                            <strong style="color: #DFE3E4;">&#10004</strong>
                                        </div>                                
                                    </td>
                                {:else}
                                    <td>
                                        <strong style="color: #DFE3E4;">&#10007</strong>                              
                                    </td>  
                                {/if}                                
                            {/if}                
                        {/each} 
                    </tr>          
                </tbody>
            </table>
        {/each}
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
        font-size: 8px;
        margin-bottom: 30px;
        text-align: center;
    }

    table th {
        height: 12px;       
        border: 1px solid #ffff;
    }

    table td {
        border: 1px solid #ffff;
    }
        
    table thead {
        background-color: #bcdff3;
    }

    table tbody {
        background-color: #f7f9fa;       
    }
   
    .tooltip {
        position: relative;
        display: inline-block;
    }

    .tooltip:hover::before {
        content: attr(data-tooltip);
        background-color: #000;
        color: #fff;
        text-align: center;
        border-radius: 6px;
        padding: 5px;
        position: absolute;
        bottom: 125%;
        left: 50%;
        transform: translateX(-50%);
        visibility: visible;
        opacity: 1;
        transition: opacity 0.3s;
    }

    .tooltip::before {
        content: "";
        visibility: hidden;
        opacity: 0;
        transition: opacity 0.3s;
    }

    @media screen and (min-width: 500px) {
        table {                         
            font-size: 12px;
        }    

        table th {
            height: 16px; 
        }
    }    

    @media screen and (min-width: 800px) {
        table {                         
            font-size: 16px;        
        }

        table th {
            height: 22px; 
        }       
    }    
</style>


