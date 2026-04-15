// QuickNode Stream Filter - Include ALL events from LendiProof contract
// Use this version for testing to capture all events

function main(payload) {
  const { data, metadata } = payload;

  // Solo procesar eventos del contrato LendiProof
  const LENDI_PROOF_ADDRESS = '0x809B8FC3C0e12f8F1b280E8A823294F98760fad4'.toLowerCase();

  // Filtrar por dirección del contrato SOLAMENTE (acepta todos los eventos)
  if (data && data.length > 0) {
    const filteredData = data.filter(log => {
      // Verificar que el log es del contrato LendiProof
      if (log.address && log.address.toLowerCase() === LENDI_PROOF_ADDRESS) {
        return true; // Acepta TODOS los eventos de este contrato
      }

      return false;
    });

    // Si no hay eventos relevantes, retornar null para no enviar webhook
    if (filteredData.length === 0) {
      return null;
    }

    // Retornar solo los eventos filtrados
    return {
      data: filteredData,
      metadata: metadata
    };
  }

  return null;
}
