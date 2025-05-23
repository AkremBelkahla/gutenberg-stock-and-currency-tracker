/**
 * Composant d'édition pour le bloc Stock Tracker.
 */
import { __ } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';
import {
    InspectorControls,
    useBlockProps,
} from '@wordpress/block-editor';
import {
    PanelBody,
    SelectControl,
    TextControl,
    ToggleControl,
    RangeControl,
    Placeholder,
    Spinner,
} from '@wordpress/components';
import StockGrid from './components/StockGrid';
import ErrorMessage from './components/ErrorMessage';
import { fetchStockData } from './utils/api';

// Liste des symboles d'actions disponibles triés par ordre alphabétique
const AVAILABLE_STOCKS = [
    { label: 'Amazon (AMZN)', value: 'AMZN' },
    { label: 'Apple (AAPL)', value: 'AAPL' },
    { label: 'Google (GOOGL)', value: 'GOOGL' },
    { label: 'Meta (META)', value: 'META' },
    { label: 'Microsoft (MSFT)', value: 'MSFT' },
    { label: 'Netflix (NFLX)', value: 'NFLX' },
    { label: 'NVIDIA (NVDA)', value: 'NVDA' },
    { label: 'Tesla (TSLA)', value: 'TSLA' },
];

export default function Edit({ attributes, setAttributes }) {
    const { stockSymbols, apiKey, autoRefresh, refreshInterval } = attributes;
    const [stockData, setStockData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const blockProps = useBlockProps();
    
    // Effet pour récupérer la clé API depuis la variable globale si disponible
    useEffect(() => {
        // Si la clé API n'est pas déjà définie dans les attributs et que la variable globale existe
        if (!apiKey && typeof window !== 'undefined' && window.stockTrackerData && window.stockTrackerData.apiKey) {
            setAttributes({ apiKey: window.stockTrackerData.apiKey });
        }
    }, []);

    // Fonction pour récupérer les données des actions
    const getStockData = async () => {
        if (!apiKey || stockSymbols.length === 0) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await fetchStockData(stockSymbols, apiKey);
            setStockData(data);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err.message || __('Erreur lors de la récupération des données', 'stock-tracker'));
        } finally {
            setLoading(false);
        }
    };

    // Effet pour charger les données initiales
    useEffect(() => {
        getStockData();
    }, [apiKey, stockSymbols]);

    // Effet pour l'actualisation automatique
    useEffect(() => {
        if (!autoRefresh || !apiKey || stockSymbols.length === 0) {
            return;
        }

        const intervalId = setInterval(() => {
            getStockData();
        }, refreshInterval * 1000);

        return () => clearInterval(intervalId);
    }, [autoRefresh, refreshInterval, apiKey, stockSymbols]);

    return (
        <>
            <InspectorControls>
                <PanelBody title={__('Paramètres du Stock Tracker', 'stock-tracker')}>
                    <TextControl
                        label={__('Clé API Finnhub', 'stock-tracker')}
                        value={apiKey}
                        onChange={(value) => setAttributes({ apiKey: value })}
                        help={__('La clé API est chargée depuis le fichier .key à la racine du plugin. Modifiez ce fichier pour changer la clé.', 'stock-tracker')}
                    />
                    <SelectControl
                        multiple
                        label={__('Symboles des actions (max 4)', 'stock-tracker')}
                        value={stockSymbols}
                        options={AVAILABLE_STOCKS}
                        onChange={(value) => {
                            if (value.length <= 4) {
                                setAttributes({ stockSymbols: value });
                            }
                        }}
                        help={stockSymbols.length >= 4 ? __('Nombre maximum de symboles atteint (4)', 'stock-tracker') : ''}
                    />
                    <ToggleControl
                        label={__('Actualisation automatique', 'stock-tracker')}
                        checked={autoRefresh}
                        onChange={(value) => setAttributes({ autoRefresh: value })}
                    />
                    {autoRefresh && (
                        <RangeControl
                            label={__('Intervalle d\'actualisation (secondes)', 'stock-tracker')}
                            value={refreshInterval}
                            onChange={(value) => setAttributes({ refreshInterval: value })}
                            min={5}
                            max={60}
                        />
                    )}
                </PanelBody>
            </InspectorControls>

            <div {...blockProps}>
                {!apiKey ? (
                    <Placeholder
                        icon="chart-line"
                        label={__('Stock Tracker', 'stock-tracker')}
                        instructions={__('Veuillez saisir votre clé API Finnhub dans les paramètres du bloc.', 'stock-tracker')}
                    />
                ) : stockSymbols.length === 0 ? (
                    <Placeholder
                        icon="chart-line"
                        label={__('Stock Tracker', 'stock-tracker')}
                        instructions={__('Veuillez sélectionner au moins un symbole d\'action dans les paramètres du bloc.', 'stock-tracker')}
                    />
                ) : error ? (
                    <ErrorMessage message={error} onRetry={getStockData} />
                ) : (
                    <>
                        <StockGrid 
                            stockData={stockData} 
                            loading={loading} 
                            lastUpdated={lastUpdated} 
                            onRefresh={getStockData}
                        />
                    </>
                )}
            </div>
        </>
    );
}
