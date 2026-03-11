const STORAGE_KEY = "pedidos_app";

let pedidos = [];
let filtroActual = "todos";
let pedidoEditandoId = null;

document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("[data-filtro='todos']").classList.add("activo");
    inicializarFormulario();
    cargarPedidos();
    renderizarTabla();
    actualizarContadores();
});

function inicializarFormulario() {
    document.getElementById("fechaPedido").value = obtenerFechaHoy();
    document.getElementById("agregarProductoBtn").addEventListener("click", agregarProducto);
    document.getElementById("pedidoForm").addEventListener("submit", crearPedido);
    document.getElementById("abonado").addEventListener("input", calcularSaldo);
    document.getElementById("busqueda").addEventListener("input", buscarPedidos);
    document.querySelectorAll("[data-filtro]").forEach(btn => {
        btn.addEventListener("click", () => {
            filtroActual = btn.dataset.filtro;
            document.querySelectorAll("[data-filtro]").forEach(b => b.classList.remove("activo"));
            btn.classList.add("activo");
            renderizarTabla();
        });
    });

    agregarProducto();
}

function cargarPedidos() {
    const data = localStorage.getItem(STORAGE_KEY);

    pedidos = data ? JSON.parse(data) : [];
}

function guardarPedidos() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pedidos));
}

function generarId() {
    return Date.now();
}

function obtenerFechaHoy() {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, "0");
    const day = String(hoy.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function agregarProducto() {
    const container = document.getElementById("productosContainer");
    const div = document.createElement("div");

    div.classList.add("producto-row");

    div.innerHTML = `
        <input type="text" placeholder="Descripción" class="nombreProducto" required>
        <input type="number" placeholder="Cantidad" class="cantidadProducto" min="1" required>
        <input type="number" placeholder="Precio unitario" class="precioProducto" min="1" required>
        <button type="button" class="eliminarProducto">X</button>
    `;

    div.querySelector(".eliminarProducto").addEventListener("click", () => {
        div.remove();
        actualizarBotonesEliminar();
        calcularTotal();
    });

    container.appendChild(div);

    div.querySelectorAll("input").forEach(input => input.addEventListener("input", calcularTotal));

    actualizarBotonesEliminar();
}

function actualizarBotonesEliminar() {
    const filas = document.querySelectorAll(".producto-row");

    filas.forEach((fila, index) => {
        const btn = fila.querySelector(".eliminarProducto");

        if (index === 0) {
            btn.style.display = "none";
        } else {
            btn.style.display = "inline-block";
        }
    });
}

function calcularTotal() {
    let total = 0;

    document.querySelectorAll(".producto-row").forEach(row => {
        const cantidad = Number(row.querySelector(".cantidadProducto").value);
        const precio = Number(row.querySelector(".precioProducto").value);

        total += cantidad * precio;
    });

    document.getElementById("total").value = formatearCLP(total);
    document.getElementById("total").dataset.valor = total;

    calcularSaldo();
}

function calcularSaldo() {
    const total = Number(document.getElementById("total").dataset.valor || 0);
    const abonado = Number(document.getElementById("abonado").value);
    const saldo = total - abonado;

    document.getElementById("saldo").value = formatearCLP(saldo);
}

function crearPedido(e) {
    e.preventDefault();

    try {
        const cliente = document.getElementById("cliente").value.trim();

        if (cliente === "") {
            alert("Ingrese cliente");
            return;
        }

        const productos = [];

        document.querySelectorAll(".producto-row").forEach(row => {
            productos.push({
                nombre: row.querySelector(".nombreProducto").value,
                cantidad: Number(row.querySelector(".cantidadProducto").value),
                precio: Number(row.querySelector(".precioProducto").value)
            });
        });

        const total = Number(document.getElementById("total").dataset.valor);
        const abonado = Number(document.getElementById("abonado").value);

        if (pedidoEditandoId) {
            const index = pedidos.findIndex(p => p.id === pedidoEditandoId);

            pedidos[index] = {
                ...pedidos[index],
                cliente,
                productos,
                fechaPedido: document.getElementById("fechaPedido").value,
                fechaEntrega: document.getElementById("fechaEntrega").value,
                total,
                abonado,
                saldo: total - abonado
            };

            pedidoEditandoId = null;
        } else {
            const pedido = {
                id: generarId(),
                cliente,
                productos,
                fechaPedido: document.getElementById("fechaPedido").value,
                fechaEntrega: document.getElementById("fechaEntrega").value,
                total,
                abonado,
                saldo: total - abonado,
                estado: "Pendiente"
            };
    
            pedidos.push(pedido);
        }


        guardarPedidos();
        document.querySelector("#pedidoForm button[type='submit']").textContent = "Guardar Pedido";
        e.target.reset();
        document.getElementById("fechaPedido").value = obtenerFechaHoy();
        document.getElementById("productosContainer").innerHTML = "";
        agregarProducto();
        renderizarTabla();
        actualizarContadores();
    } catch (err) {
        console.error("Error al crear pedido", err);
    }
}

function renderizarTabla() {
    const tbody = document.getElementById("tablaPedidos");

    tbody.innerHTML = "";

    let lista = [...pedidos];

    const textoBusqueda = document.getElementById("busqueda").value.toLowerCase().trim() || "";
    
    // Filtro por estado
    if (filtroActual !== "todos") {
        lista = lista.filter(p => p.estado === filtroActual);
    }

    // Búsqueda
    if (textoBusqueda) {
        lista = lista.filter(p => {
            const cliente = p.cliente.toLowerCase();
            const productos = p.productos.map(prod => prod.nombre.toLowerCase()).join(" ");

            return cliente.includes(textoBusqueda) || productos.includes(textoBusqueda);
        });
    }
    
    // Separar Pendientes / Entregados
    const pendientes = lista.filter(p => p.estado === "Pendiente");
    const entregados = lista.filter(p => p.estado === "Entregado");

    // Ordenar por Fecha de Entrega
    pendientes.sort((a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega));
    entregados.sort((a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega));

    // Unir lista final
    lista = [...pendientes, ...entregados];

    // Renderizar
    lista.forEach(pedido => {
        const tr = document.createElement("tr");

        if (pedido.estado === "Entregado") {
            tr.classList.add("entregado");
        } else {
            tr.className = obtenerClaseEntrega(pedido.fechaEntrega);
        }

        tr.classList.add(obtenerClaseEntrega(pedido.fechaEntrega));

        tr.innerHTML = `
            <td>${pedido.cliente}</td>
            <td>${resumenProductos(pedido.productos)}</td>
            <td>${formatearFecha(pedido.fechaPedido)}</td>
            <td>${formatearFecha(pedido.fechaEntrega)}</td>
            <td>${formatearCLP(pedido.total)}</td>
            <td>${formatearCLP(pedido.abonado)}</td>
            <td>${formatearCLP(pedido.saldo)}</td>
            <td>${pedido.estado}</td>
            <td>
            <button onclick="editarPedido(${pedido.id})">Editar</button>
            <button onclick="cambiarEstado(${pedido.id})">Estado</button>
            <button onclick="eliminarPedido(${pedido.id})">Eliminar</button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function resumenProductos(productos) {
    return productos.map(p => `${p.nombre} x ${p.cantidad}`).join("<br>");
}

function eliminarPedido(id) {
    const pedido = pedidos.find(p => p.id === id);

    if (!confirm(`Eliminar pedido de ${pedido.cliente}?\nTotal: ${formatearCLP(pedido.total)}`)) {
        return;
    }

    pedidos = pedidos.filter(p => p.id !== id);

    guardarPedidos();
    renderizarTabla();
    actualizarContadores();
}

function cambiarEstado(id) {
    const pedido = pedidos.find(p => p.id === id);

    pedido.estado = pedido.estado === "Pendiente" ? "Entregado" : "Pendiente";

    guardarPedidos();
    renderizarTabla();
    actualizarContadores();
}

function editarPedido(id) {
    const pedido = pedidos.find(p => p.id === id);

    pedidoEditandoId = id;

    document.getElementById("cliente").value = pedido.cliente;
    document.getElementById("fechaPedido").value = pedido.fechaPedido;
    document.getElementById("fechaEntrega").value = pedido.fechaEntrega;
    document.getElementById("abonado").value = pedido.abonado;

    const container = document.getElementById("productosContainer");

    container.innerHTML = "";

    pedido.productos.forEach(prod => {
        agregarProducto();

        const filas = document.querySelectorAll(".producto-row");
        const ultima = filas[filas.length - 1];

        ultima.querySelector(".nombreProducto").value = prod.nombre;
        ultima.querySelector(".cantidadProducto").value = prod.cantidad;
        ultima.querySelector(".precioProducto").value = prod.precio;
    });

    calcularTotal();
    document.querySelector("#pedidoForm button[type='submit']").textContent = "Actualizar Pedido";
}

function buscarPedidos() {
    renderizarTabla();
}

function actualizarContadores() {
    document.getElementById("countTodos").textContent = pedidos.length;
    document.getElementById("countPendientes").textContent = pedidos.filter(p => p.estado === "Pendiente").length;
    document.getElementById("countEntregados").textContent = pedidos.filter(p => p.estado === "Entregado").length;
}

function formatearCLP(valor) {
    return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP"
    }).format(valor);
}

function formatearFecha(fecha) {
    const [y, m, d] = fecha.split("-");

    return `${d}-${m}-${y}`;
}

function obtenerClaseEntrega(fechaEntrega) {
    const hoy = new Date();
    const entrega = new Date(fechaEntrega);
    const diff = Math.floor((entrega - hoy) / (1000 * 60 * 60 * 24));

    if (diff < 0) return "atrasado";
    if (diff === 0) return "hoy";
    if (diff === 1) return "manana";

    return "normal";
}