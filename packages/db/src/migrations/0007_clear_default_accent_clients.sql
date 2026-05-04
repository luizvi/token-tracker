-- Limpa cor de clientes que ficaram com o accent default antigo (#1fe879).
-- Esses clientes nunca tiveram cor escolhida intencionalmente — herdaram o default
-- via inicialização do form. Após esta migration, eles passam a herdar a cor
-- do tema atual (dashboard.brandAccent), atualizando dinamicamente quando você
-- mudar o accent em /settings.
UPDATE `clients` SET `color` = NULL WHERE `color` = '#1fe879';
