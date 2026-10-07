'use client'

import React, { useState, useEffect } from 'react'

interface AvisoLegalModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: number
}

export default function AvisoLegalModal({ isOpen, onClose, initialTab = 0 }: AvisoLegalModalProps) {
  const [activeTab, setActiveTab] = useState<number>(initialTab)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab, isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = 'auto'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const tabs = [
    { id: 0, title: 'Términos y Condiciones', icon: '📜' },
    { id: 1, title: 'Aviso de Privacidad', icon: '🔒' },
    { id: 2, title: 'Política de Cookies', icon: '🍪' },
    { id: 3, title: 'Certificado de Operaciones', icon: '🛡️' },
    { id: 4, title: 'Garantía Legal (EU Notice)', icon: '🇪🇺' }
  ]

  return (
    <div 
      className="legal-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        className="legal-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          color: '#1e293b',
          width: '100%',
          maxWidth: '960px',
          maxHeight: '90vh',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          animation: 'fadeInModal 0.25s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚖️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a', fontFamily: 'Georgia, serif' }}>
                AVISO LEGAL Y MARCO NORMATIVO
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                MERCATUM — Información Legal, Términos de Venta, Privacidad y Garantías
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#e2e8f0'
              e.currentTarget.style.color = '#0f172a'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#f1f5f9'
              e.currentTarget.style.color = '#64748b'
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Menu */}
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          background: '#f1f5f9',
          padding: '4px 12px 0 12px',
          borderBottom: '1px solid #cbd5e1',
          gap: '4px'
        }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 18px',
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#0f172a' : '#64748b',
                  fontWeight: isActive ? '700' : '500',
                  fontSize: '13px',
                  border: 'none',
                  borderTopLeftRadius: '8px',
                  borderTopRightRadius: '8px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isActive ? '0 -2px 5px rgba(0,0,0,0.04)' : 'none',
                  borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.title}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content Body */}
        <div style={{
          padding: '28px 32px',
          overflowY: 'auto',
          flex: 1,
          fontSize: '14px',
          lineHeight: '1.7',
          color: '#334155'
        }}>
          {/* TAB 0: TÉRMINOS Y CONDICIONES GENERALES DE VENTA */}
          {activeTab === 0 && (
            <div>
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #e2e8f0' }}>
                <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                  Normativa de Comercio Electrónico
                </span>
                <h2 style={{ margin: '12px 0 4px', fontSize: '22px', fontWeight: '800', color: '#0f172a', fontFamily: 'Georgia, serif' }}>
                  TÉRMINOS Y CONDICIONES GENERALES DE VENTA
                </h2>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                  Última actualización: 15 de enero de 2025
                </p>
              </div>

              <div className="legal-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  1. INFORMACIÓN GENERAL Y TITULARIDAD DEL SITIO
                </h4>
                <p style={{ margin: '0 0 10px' }}>
                  El presente documento regula las Condiciones Generales de Venta aplicables a la adquisición de productos físicos a través de la plataforma web:
                </p>
                <ul style={{ margin: '0 0 10px', paddingLeft: '20px' }}>
                  <li><strong>Nombre comercial:</strong> MERCATUM</li>
                  <li><strong>Sitio web oficial:</strong> www.mercatum-shop.app</li>
                  <li><strong>Dirección fiscal:</strong> Paseo de la Castellana, 28046 Madrid, España</li>
                  <li><strong>Correo electrónico de contacto y atención al cliente:</strong> contacto@mercatum-shop.app</li>
                </ul>
                <p style={{ margin: 0 }}>
                  La realización de cualquier pedido a través de www.mercatum-shop.app implica la aceptación plena y sin reservas de los presentes términos por parte del usuario.
                </p>
              </div>

              <div className="legal-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  2. OBJETO Y DISPONIBILIDAD
                </h4>
                <p style={{ margin: '0 0 10px' }}>
                  Las presentes condiciones tienen por objeto regular los términos de compraventa de los productos físicos ofrecidos en el catálogo virtual de MERCATUM.
                </p>
                <p style={{ margin: 0 }}>
                  Todos los pedidos están sujetos a la disponibilidad de existencias. En caso de rotura de stock sobrevenida o imposibilidad de suministro de un artículo adquirido, se notificará de inmediato al cliente y se procederá al reembolso íntegro de la cantidad abonada mediante el mismo método de pago empleado en la compra.
                </p>
              </div>

              <div className="legal-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  3. PRECIOS, ENVÍO GRATUITO Y MÉTODO DE PAGO
                </h4>
                <ul style={{ margin: '0 0 10px', paddingLeft: '20px' }}>
                  <li style={{ marginBottom: '8px' }}>
                    <strong>Precios finales "todo incluido":</strong> Todos los precios exhibidos en el catálogo de www.mercatum-shop.app están expresados en Euros (€) y constituyen el importe total y final a pagar. En dicho precio se encuentran ya integrados los impuestos legalmente aplicables (como el IVA) y el coste total del transporte (ENVÍO GRATUITO en todos los pedidos, sin costes ocultos ni suplementos al finalizar la compra).
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    <strong>Método de pago aceptado:</strong> El abono de los pedidos se realiza exclusivamente mediante TRANSFERENCIA BANCARIA SEGURA. Al confirmar la solicitud de compra, se facilitarán al cliente los datos de la cuenta bancaria de la empresa y la referencia única que deberá indicar en el concepto del traspaso.
                  </li>
                  <li>
                    <strong>Validación y seguridad:</strong> La orden de compra comenzará a procesarse una vez verificada la recepción efectiva de los fondos o el comprobante oficial de la transferencia emitido por la entidad bancaria correspondiente. Todas las comunicaciones e instrucciones bancarias se transmiten de forma cifrada y protegida mediante protocolos seguros SSL/TLS.
                  </li>
                </ul>
              </div>

              <div className="legal-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  4. POLÍTICA DE ENVÍOS Y PLAZOS DE ENTREGA
                </h4>
                <ul style={{ margin: '0 0 10px', paddingLeft: '20px' }}>
                  <li style={{ marginBottom: '6px' }}><strong>Coste del servicio:</strong> El servicio de transporte e itinerario logístico es 100% gratuito para el cliente en todos los productos de la tienda.</li>
                  <li style={{ marginBottom: '6px' }}><strong>Gestión de las entregas:</strong> Los pedidos se envían a través de agencias de transporte y logística autorizadas a la dirección postal facilitada por el comprador. Los plazos estimados de entrega comenzarán a contar a partir de la confirmación de la transferencia bancaria.</li>
                  <li><strong>Seguimiento:</strong> Una vez expedido el paquete, el cliente recibirá por correo electrónico un número o enlace de seguimiento logístico para comprobar el estado de su envío en tiempo real.</li>
                </ul>
              </div>

              <div className="legal-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  5. DERECHO DE DESISTIMIENTO (DEVOLUCIONES)
                </h4>
                <p style={{ margin: '0 0 8px' }}>Conforme a la normativa europea de protección a los consumidores y usuarios:</p>
                <ul style={{ margin: '0 0 10px', paddingLeft: '20px' }}>
                  <li style={{ marginBottom: '6px' }}><strong>Plazo:</strong> El comprador dispone de un plazo de 14 días naturales a partir de la recepción del producto para ejercer su derecho de desistimiento sin necesidad de justificación.</li>
                  <li style={{ marginBottom: '6px' }}><strong>Condiciones del artículo:</strong> Para admitir la devolución, el producto debe hallarse en perfecto estado, sin utilizar, con su embalaje original, accesorios, manuales y precintos intactos.</li>
                  <li><strong>Trámite:</strong> Para tramitar una devolución, el cliente debe remitir un mensaje a contacto@mercatum-shop.app señalando el número de pedido. Los costes directos de retorno del producto correrán a cargo del comprador, salvo en caso de defecto de origen o equivocación atribuible a la tienda. En caso de reembolso, este se efectuará mediante transferencia bancaria a la cuenta indicada por el cliente.</li>
                </ul>
              </div>

              <div className="legal-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  6. GARANTÍA LEGAL Y CONFORMIDAD
                </h4>
                <p style={{ margin: '0 0 8px' }}>
                  Todos los productos distribuidos por MERCATUM gozan de la garantía legal de conformidad estipulada por la legislación aplicable a bienes de consumo.
                </p>
                <p style={{ margin: 0 }}>
                  En caso de recibir un artículo con defectos o vicios de fabricación, el cliente tiene derecho a la reparación, sustitución, rebaja de precio o resolución de la compra conforme a derecho, notificándolo a contacto@mercatum-shop.app con evidencias o fotografías del estado del producto.
                </p>
              </div>

              <div className="legal-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  7. PROTECCIÓN DE DATOS PERSONALES
                </h4>
                <p style={{ margin: 0 }}>
                  Los datos personales recabados durante el proceso de compra son tratados con estricta confidencialidad de acuerdo con el Aviso de Privacidad de la tienda y las leyes de privacidad vigentes, garantizando el ejercicio de los derechos ARCO (Acceso, Rectificación, Cancelación y Oposición) a través del canal: contacto@mercatum-shop.app.
                </p>
              </div>

              <div className="legal-section">
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  8. LEGISLACIÓN APLICABLE Y RESOLUCIÓN DE CONFLICTOS
                </h4>
                <p style={{ margin: '0 0 8px' }}>
                  Las relaciones comerciales efectuadas mediante www.mercatum-shop.app se rigen por la legislación aplicable en España y la Unión Europea relativa al comercio electrónico y defensa de los consumidores.
                </p>
                <p style={{ margin: 0 }}>
                  Para la resolución de cualquier litigio derivado de la interpretación o ejecución de estas condiciones, ambas partes se someterán a los juzgados y tribunales que correspondan al fuero del consumidor o a los legalmente determinados.
                </p>
              </div>
            </div>
          )}

          {/* TAB 1: AVISO DE PRIVACIDAD Y PROTECCIÓN DE DATOS */}
          {activeTab === 1 && (
            <div>
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #e2e8f0' }}>
                <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                  Protección de Datos &amp; RGPD
                </span>
                <h2 style={{ margin: '12px 0 4px', fontSize: '22px', fontWeight: '800', color: '#0f172a', fontFamily: 'Georgia, serif' }}>
                  AVISO DE PRIVACIDAD Y PROTECCIÓN DE DATOS
                </h2>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Última actualización: 15 de enero de 2025
                </p>
              </div>

              <div className="legal-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  1. RESPONSABLE DEL TRATAMIENTO DE LOS DATOS PERSONALES
                </h4>
                <p style={{ margin: '0 0 8px' }}>El responsable del tratamiento de los datos recabados a través del sitio web es:</p>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><strong>Denominación comercial:</strong> MERCATUM</li>
                  <li><strong>Sitio web:</strong> www.mercatum-shop.app</li>
                  <li><strong>Domicilio:</strong> Paseo de la Castellana, 28046 Madrid, España</li>
                  <li><strong>Correo electrónico de contacto y privacidad:</strong> contacto@mercatum-shop.app</li>
                </ul>
              </div>

              <div className="legal-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  2. DATOS PERSONALES QUE SE RECABAN
                </h4>
                <p style={{ margin: '0 0 8px' }}>Para cumplir con los servicios de venta y entrega, se recopilan los siguientes datos personales:</p>
                <ul style={{ margin: '0 0 10px', paddingLeft: '20px' }}>
                  <li><strong>Datos identificativos:</strong> Nombre, apellidos y documento de identidad (si procede).</li>
                  <li><strong>Datos de contacto:</strong> Dirección postal de envío y facturación, dirección de correo electrónico y número de teléfono.</li>
                  <li><strong>Datos transaccionales:</strong> Detalles de los pedidos realizados, historial de compras y preferencias de entrega.</li>
                  <li><strong>Datos de navegación técnica:</strong> Dirección IP, cookies y datos de uso de la web (conforme a la política de cookies del sitio).</li>
                </ul>
                <p style={{ margin: 0, padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #3b82f6', fontSize: '13px' }}>
                  <strong>Nota:</strong> Los datos bancarios y de tarjetas de crédito son procesados directamente por pasarelas de pago seguras mediante protocolos SSL/TLS y nunca son almacenados en nuestros servidores.
                </p>
              </div>

              <div className="legal-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  3. FINALIDAD DEL TRATAMIENTO DE LOS DATOS
                </h4>
                <p style={{ margin: '0 0 8px' }}>Los datos proporcionados por el usuario serán utilizados para los siguientes fines indispensables:</p>
                <ol type="a" style={{ margin: 0, paddingLeft: '20px' }}>
                  <li style={{ marginBottom: '4px' }}>Procesar, gestionar, facturar y enviar los pedidos solicitados a través de www.mercatum-shop.app.</li>
                  <li style={{ marginBottom: '4px' }}>Proveer servicio de atención al cliente, soporte postventa y seguimiento logístico de los envíos.</li>
                  <li style={{ marginBottom: '4px' }}>Dar cumplimiento a las obligaciones legales, contables, fiscales y normativas aplicables al comercio electrónico.</li>
                  <li style={{ marginBottom: '4px' }}>Enviar comunicaciones operativas sobre el estado de las transacciones.</li>
                  <li>(Opcional, previo consentimiento expreso) Envío de ofertas comerciales, novedades o promociones del catálogo.</li>
                </ol>
              </div>

              <div className="legal-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  4. LEGITIMACIÓN PARA EL TRATAMIENTO
                </h4>
                <p style={{ margin: '0 0 8px' }}>La base legal para el tratamiento de sus datos es:</p>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>La ejecución del contrato de compraventa y prestación de servicios solicitados.</li>
                  <li>El cumplimiento de obligaciones legales aplicables a la actividad mercantil.</li>
                  <li>El consentimiento expreso del usuario para consultas específicas o comunicaciones comerciales.</li>
                </ul>
              </div>

              <div className="legal-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  5. DESTINATARIOS Y TRANSFERENCIA DE DATOS
                </h4>
                <p style={{ margin: '0 0 8px' }}>
                  Sus datos no serán vendidos ni cedidos a terceros con fines publicitarios. Únicamente se comunicarán a proveedores externos indispensables para la operativa del servicio:
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>Empresas de transporte y logística para la entrega de los paquetes.</li>
                  <li>Pasarelas de pago y entidades financieras para el cobro seguro.</li>
                  <li>Autoridades tributarias o judiciales en cumplimiento estricto de la ley.</li>
                </ul>
              </div>

              <div className="legal-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  6. DERECHOS DEL USUARIO (DERECHOS ARCO)
                </h4>
                <p style={{ margin: '0 0 8px' }}>El usuario tiene derecho a solicitar en cualquier momento el ejercicio de sus derechos reconocidos por la normativa de protección de datos:</p>
                <ul style={{ margin: '0 0 10px', paddingLeft: '20px' }}>
                  <li><strong>Acceso:</strong> Conocer qué datos personales suyos están siendo tratados.</li>
                  <li><strong>Rectificación:</strong> Modificar o corregir datos inexactos o incompletos.</li>
                  <li><strong>Cancelación / Supresión:</strong> Solicitar la eliminación de sus datos cuando ya no sean necesarios para los fines que fueron recabados.</li>
                  <li><strong>Oposición:</strong> Oponerse al tratamiento de sus datos para finalidades específicas.</li>
                  <li><strong>Limitación y Portabilidad:</strong> Restringir su uso o solicitar una copia de los mismos.</li>
                </ul>
                <p style={{ margin: 0 }}>
                  Para ejercer cualquiera de estos derechos, el titular debe enviar una solicitud por correo electrónico a: <strong>contacto@mercatum-shop.app</strong> indicando como asunto "Ejercicio de Derechos ARCO / Datos Personales" e incluyendo una copia de documento acreditativo de su identidad.
                </p>
              </div>

              <div className="legal-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  7. MEDIDAS DE SEGURIDAD
                </h4>
                <p style={{ margin: 0 }}>
                  MERCATUM implementa medidas de seguridad técnicas y organizativas para evitar el acceso no autorizado, alteración, pérdida o tratamiento no consentido de los datos personales, utilizando estándares de cifrado y conexiones protegidas.
                </p>
              </div>

              <div className="legal-section">
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  8. MODIFICACIONES AL AVISO DE PRIVACIDAD
                </h4>
                <p style={{ margin: 0 }}>
                  MERCATUM se reserva el derecho de actualizar el presente documento para adaptarlo a novedades legislativas o cambios operativos. Cualquier actualización será publicada en esta misma sección del sitio web.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: POLÍTICA DE COOKIES */}
          {activeTab === 2 && (
            <div>
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #e2e8f0' }}>
                <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                  Transparencia Técnica
                </span>
                <h2 style={{ margin: '12px 0 4px', fontSize: '22px', fontWeight: '800', color: '#0f172a', fontFamily: 'Georgia, serif' }}>
                  POLÍTICA DE COOKIES
                </h2>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Última actualización: 15 de enero de 2025
                </p>
              </div>

              <div className="legal-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  1. IDENTIFICACIÓN Y RESPONSABLE
                </h4>
                <p style={{ margin: '0 0 8px' }}>El presente documento regula el uso de cookies en el sitio web:</p>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><strong>Titular comercial:</strong> MERCATUM</li>
                  <li><strong>Sitio web oficial:</strong> www.mercatum-shop.app</li>
                  <li><strong>Domicilio fiscal:</strong> Paseo de la Castellana, 28046 Madrid, España</li>
                  <li><strong>Correo electrónico de contacto:</strong> contacto@mercatum-shop.app</li>
                </ul>
              </div>

              <div className="legal-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  2. ¿QUÉ SON LAS COOKIES?
                </h4>
                <p style={{ margin: 0 }}>
                  Una cookie es un pequeño archivo de texto que un sitio web descarga en su navegador u ordenador al acceder a determinadas páginas. Las cookies permiten a la plataforma almacenar y recuperar información sobre los hábitos de navegación del usuario o de su dispositivo, facilitando la operatividad técnica y la personalización de la experiencia de compra.
                </p>
              </div>

              <div className="legal-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  3. TIPOS DE COOKIES UTILIZADAS EN ESTE SITIO WEB
                </h4>
                <p style={{ margin: '0 0 8px' }}>En www.mercatum-shop.app se emplean las siguientes categorías de cookies:</p>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li style={{ marginBottom: '6px' }}><strong>a) Cookies Técnicas y Estrictamente Necesarias:</strong> Indispensables para el funcionamiento correcto de la tienda online. Permiten la navegación fluida, la gestión de la cesta de compras y la comunicación de datos.</li>
                  <li style={{ marginBottom: '6px' }}><strong>b) Cookies de Preferencias o Personalización:</strong> Permiten recordar información para que el usuario acceda con características personalizadas (como idioma o moneda).</li>
                  <li style={{ marginBottom: '6px' }}><strong>c) Cookies de Análisis o Medición:</strong> Permiten cuantificar el número de usuarios y realizar mediciones estadísticas para optimizar el rendimiento.</li>
                  <li><strong>d) Cookies de Seguridad:</strong> Utilizadas para proteger las sesiones de los usuarios y prevenir actividades fraudulentas.</li>
                </ul>
              </div>

              <div className="legal-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  4. GESTIÓN Y CONFIGURACIÓN DEL CONSENTIMIENTO
                </h4>
                <p style={{ margin: 0 }}>
                  Al acceder por primera vez a www.mercatum-shop.app, se muestra un banner informativo que permite aceptar todas las cookies, rechazar las cookies no esenciales o configurar de manera personalizada sus preferencias en cualquier momento.
                </p>
              </div>

              <div className="legal-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  5. CÓMO DESACTIVAR O ELIMINAR LAS COOKIES EN EL NAVEGADOR
                </h4>
                <p style={{ margin: '0 0 8px' }}>El usuario puede en todo momento permitir, bloquear o eliminar las cookies instaladas en su equipo mediante la configuración de las opciones de su navegador:</p>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><strong>Google Chrome:</strong> Configuración &gt; Privacidad y seguridad &gt; Cookies y otros datos de sitios.</li>
                  <li><strong>Mozilla Firefox:</strong> Opciones &gt; Privacidad y Seguridad &gt; Cookies y datos del sitio.</li>
                  <li><strong>Microsoft Edge:</strong> Configuración &gt; Cookies y permisos del sitio &gt; Cookies y datos guardados.</li>
                  <li><strong>Apple Safari:</strong> Preferencias &gt; Privacidad &gt; Bloquear cookies.</li>
                </ul>
              </div>

              <div className="legal-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  6. DERECHOS Y PROTECCIÓN DE DATOS
                </h4>
                <p style={{ margin: 0 }}>
                  Para obtener más información sobre el tratamiento de sus datos personales y el ejercicio de los derechos ARCO, consulte nuestro Aviso de Privacidad o contacte directamente a través de: <strong>contacto@mercatum-shop.app</strong>.
                </p>
              </div>

              <div className="legal-section">
                <h4 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: '0 0 8px' }}>
                  7. ACTUALIZACIÓN DE LA POLÍTICA DE COOKIES
                </h4>
                <p style={{ margin: 0 }}>
                  MERCATUM puede modificar la presente Política de Cookies en función de nuevas exigencias legislativas, reglamentarias o técnicas. Se recomienda revisar este documento periódicamente.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: CERTIFICADO DE OPERACIONES COMERCIALES */}
          {activeTab === 3 && (
            <div>
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ background: '#f3e8ff', color: '#6b21a8', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                    Acreditación Oficial de Conformidad
                  </span>
                  <a
                    href="/legal/certificado-operaciones-comerciales.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#2563eb',
                      color: '#ffffff',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                    }}
                  >
                    <span>📄</span>
                    <span>Descargar Documento PDF Oficial</span>
                  </a>
                </div>
                <h2 style={{ margin: '12px 0 4px', fontSize: '22px', fontWeight: '800', color: '#0f172a', fontFamily: 'Georgia, serif' }}>
                  CERTIFICADO DE OPERACIONES COMERCIALES
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#475569', fontWeight: '600' }}>
                  Acreditación de Conformidad Operativa, Transparencia Mercantil y Privacidad Digital
                </p>
              </div>

              {/* Official Certificate Card */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>N.º DE EXPEDIENTE REGISTRADO</span>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>ES-MERC-2026-0929</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ESTADO DE REGISTRO</span>
                    <div>
                      <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
                        ✓ ACTIVO / VERIFICADO
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                  <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <strong style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>NOMBRE COMERCIAL</strong>
                    <span style={{ color: '#0f172a', fontWeight: '700' }}>MERCATUM</span>
                  </div>
                  <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <strong style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>SITIO WEB OFICIAL</strong>
                    <span style={{ color: '#2563eb', fontWeight: '700' }}>www.mercatum-shop.app</span>
                  </div>
                  <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <strong style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>DOMICILIO FISCAL</strong>
                    <span style={{ color: '#0f172a', fontSize: '12px' }}>Paseo de la Castellana, 28046 Madrid, España</span>
                  </div>
                  <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <strong style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>CORREO ARCO &amp; CONTACTO</strong>
                    <span style={{ color: '#0f172a', fontSize: '12px' }}>contacto@mercatum-shop.app</span>
                  </div>
                  <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <strong style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>FECHA DE EMISIÓN</strong>
                    <span style={{ color: '#0f172a', fontWeight: '600' }}>29 de septiembre de 2026</span>
                  </div>
                  <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <strong style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>FECHA DE VENCIMIENTO</strong>
                    <span style={{ color: '#0f172a', fontWeight: '600' }}>29 de septiembre de 2029</span>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ color: '#0f172a', fontSize: '14px', fontWeight: '700', margin: '0 0 8px' }}>
                    2. DECLARACIÓN DE CONFORMIDAD Y CUMPLIMIENTO LEGAL
                  </h4>
                  <p style={{ margin: '0 0 10px', fontSize: '13px' }}>
                    Por medio del presente documento, se certifica que la plataforma digital MERCATUM ha suscrito y adoptado los protocolos normativos correspondientes a las operaciones comerciales en línea:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                    <li style={{ marginBottom: '6px' }}>
                      <strong>a) Protección de Datos Personales:</strong> Cumplimiento estricto de las normativas vigentes sobre tratamiento y seguridad de los datos de carácter personal, garantizando el acceso, rectificación, cancelación y oposición (derechos ARCO).
                    </li>
                    <li style={{ marginBottom: '6px' }}>
                      <strong>b) Seguridad de Transacciones:</strong> Integración de pasarelas de pago cifradas y protocolos de transferencia segura de datos (SSL/TLS) para el resguardo de la confidencialidad en las operaciones comerciales.
                    </li>
                    <li>
                      <strong>c) Transparencia y Código de Ética:</strong> Aplicación de estándares de buenas prácticas comerciales en internet, políticas claras de información al consumidor, condiciones de entrega y términos de compraventa.
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 style={{ color: '#0f172a', fontSize: '14px', fontWeight: '700', margin: '0 0 6px' }}>
                    3. CONSTANCIA DE VALIDEZ
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px' }}>
                    El titular del dominio www.mercatum-shop.app asume la titularidad de los servicios comercializados y la conformidad operativa frente a los usuarios.
                  </p>
                </div>
              </div>

              {/* Digital Seals & Badges Section */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Sellos Digitales y Verificación de Registro
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '20px', margin: '14px 0' }}>
                  <div style={{ padding: '8px 14px', background: '#1e3a8a', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🛡️</span> GDPR Compliance
                  </div>
                  <div style={{ padding: '8px 14px', background: '#d97706', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔒</span> 100% SECURE SSL
                  </div>
                  <div style={{ padding: '8px 14px', background: '#0f172a', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⭐</span> TRUSTED SHOPS GUARANTEE
                  </div>
                  <div style={{ padding: '8px 14px', background: '#7c3aed', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🤝</span> CONFIANZA ONLINE
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                  Verificación del registro oficial: <a href="https://www.mercatum-shop.app/legal/certificacion" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: '600' }}>https://www.mercatum-shop.app/legal/certificacion</a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GARANTÍA LEGAL (EU NOTICE) */}
          {activeTab === 4 && (
            <div>
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #e2e8f0' }}>
                <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                  Directiva Europea de Consumo
                </span>
                <h2 style={{ margin: '12px 0 4px', fontSize: '22px', fontWeight: '800', color: '#0f172a', fontFamily: 'Georgia, serif' }}>
                  GARANTÍA LEGAL (EU NOTICE)
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                  Garantía legal mínima de 3 años para los bienes vendidos en la Unión Europea
                </p>
              </div>

              {/* Informative text box */}
              <div style={{ background: '#eff6ff', borderLeft: '4px solid #2563eb', padding: '16px 20px', borderRadius: '8px', marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 6px', color: '#1e40af', fontSize: '15px', fontWeight: '700' }}>
                  Garantía legal mínima de tres años
                </h4>
                <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#1e3a8a' }}>
                  Los consumidores pueden hacer valer los derechos que les otorga la garantía legal de conformidad si los bienes:
                </p>
                <ul style={{ margin: '0 0 10px', paddingLeft: '20px', fontSize: '13px', color: '#1e3a8a' }}>
                  <li>✓ No coinciden con la descripción dada en el sitio web;</li>
                  <li>✓ No funcionan según lo previsto o presentan defectos de fabricación.</li>
                </ul>
                <p style={{ margin: 0, fontSize: '13px', color: '#1e3a8a' }}>
                  Los vendedores son responsables de cualquier falta de conformidad. Están obligados a ofrecer <strong>la reparación o sustitución gratuitas</strong>, o en algunos casos, una reducción del precio o un reembolso total.
                </p>
              </div>

              {/* Steps box */}
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '16px 20px', borderRadius: '8px', marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 10px', color: '#0f172a', fontSize: '14px', fontWeight: '700' }}>
                  Qué hacer si recibe bienes no conformes:
                </h4>
                <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#334155' }}>
                  <li style={{ marginBottom: '6px' }}><strong>Póngase en contacto con el vendedor:</strong> remita un correo a <code>contacto@mercatum-shop.app</code> notificando el problema.</li>
                  <li><strong>Aporte pruebas de la compra:</strong> incluya un comprobante como el número de pedido, factura o justificante bancario.</li>
                </ol>
              </div>

              {/* Official Images Section */}
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 14px', color: '#0f172a', fontSize: '15px', fontWeight: '700' }}>
                  Visualización del Aviso Oficial de Garantía Legal de la Unión Europea
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', background: '#ffffff', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>VERSIÓN EN COLOR (EU NOTICE)</div>
                    <img
                      src="/legal/garantia-legal-eu-1.jpg"
                      alt="Garantía Legal EU Notice Color"
                      style={{ width: '100%', borderRadius: '8px', border: '1px solid #f1f5f9', cursor: 'pointer' }}
                      onClick={() => window.open('/legal/garantia-legal-eu-1.jpg', '_blank')}
                    />
                  </div>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', background: '#ffffff', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>VERSIÓN OFICIAL B&amp;W (EU NOTICE)</div>
                    <img
                      src="/legal/garantia-legal-eu-2.jpg"
                      alt="Garantía Legal EU Notice Blanco y Negro"
                      style={{ width: '100%', borderRadius: '8px', border: '1px solid #f1f5f9', cursor: 'pointer' }}
                      onClick={() => window.open('/legal/garantia-legal-eu-2.jpg', '_blank')}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info inside modal */}
        <div style={{
          padding: '14px 28px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#64748b'
        }}>
          <div>
            © 2026 MERCATUM — Todos los derechos reservados.
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '6px 18px',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
