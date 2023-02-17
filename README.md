# stchess-app

Analisador de partidas de xadrez usando stockfish

------

Esse projeto inicia um servidor websocket que analisa partidas de xadrez utilizando a engine stockfish, cada instancia do stockfish utiliza aproximadamente 80mb de ram.

A aplicação possui suporte para iniciar multiplos stockfish para uma analise rapida, isso para um computador local pode ser util, mas para um servidor dedicado não é recomendado, pois o sistema de cache do stockfish não funcionara direito.

### Tipos de Lance

* Lance Brilhante (BRILHANTE)

Quando um jogador realiza um sacrificio para melhorar sua posição, é dado como um lance brilhante, um lance fora da caixa e normalmente dificil de enxergar

* Lance Critico (CRITICAL)

Quando um jogador realiza um movimento que era o unico bom na posição

* Melhor Lance (BEST)

Quando o jogador realiza o melhor lance da posição

* Lance Excelente (EXCELENT)

Quando o jogador realiza um lance bom para sua posição, mas não o melhor

* Lance Bom (BOM)

Quando o jogador realiza um lance na sua posição que piora um pouco sua posição, mas que não é um lance horrivel

* Lance Imprudente (IMPRUDENTE)

Quando o jogador realiza um lance que piora sua posição mais que um lance bom

* Erro (MISTAKE)

Quando o jogador realiza um movimento que piora bastante sua posição, como entregar uma peça ou permite um xeque-mate forçado

* Erro Tatico (TATICAL_ERROR)

Quando um jogador realiza um movimento que piora bastante sua posição, mas que não perde material, lance que normalmente perde um tema tatico (como criar um peão passado)

* Capivarada (CAPIVARADA)

Um dos piores lances possivel na posição, lance que da uma vantagem enorme ao oponente ou permite um xeque-mate forçado em pouquissimos lances

* Vitoria Perdida (VITORIA_PERDIDA)

Quando executa um lance que perde uma sequencia de xeque-mate ou perde uma vantagem ganhadora