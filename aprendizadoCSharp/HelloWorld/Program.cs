using System;

namespace PrimeiroProjeto
{

    class Cliente
    {
        public string? nome;
        public int idade = 44;
        public string? email;
    }

    class Program
    {
        static void Main(string[] args)
        {
            Cliente cliente = new Cliente();
            cliente.nome = "Rods";

            cliente.email = "rods@rods.com";

            Console.WriteLine(cliente.nome);
            Console.WriteLine(cliente.idade);
            Console.WriteLine(cliente.email);
        }
    }
}