'use client'

import { CurrencyCode } from '@/lib/currency'
import CurrencySelector from '../CurrencySelector'
import FilterDropdown from '../FilterDropdown'
import StatusToast from './StatusToast'
import CampaignCard from './CampaignCard'
import { CAMPAIGN_SORT_OPTIONS, COUNTRY_FILTER_OPTIONS, SOCIAL_FILTER_OPTIONS } from './constants'
import { FilterLabel } from './filter-ui'

export default function CreatorView({
  toast,
  search,
  setSearch,
  loading,
  showCampaignFilters,
  setShowCampaignFilters,
  campaignSortBy,
  setCampaignSortBy,
  displayCurrency,
  setDisplayCurrency,
  filterCountry,
  setFilterCountry,
  filterSocialNet,
  setFilterSocialNet,
  minBudget,
  setMinBudget,
  maxBudget,
  setMaxBudget,
  minRequiredSubs,
  setMinRequiredSubs,
  maxRequiredSubs,
  setMaxRequiredSubs,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  filteredCampaigns,
}: {
  toast: string | null
  search: string
  setSearch: (v: string) => void
  loading: boolean
  showCampaignFilters: boolean
  setShowCampaignFilters: (v: boolean) => void
  campaignSortBy: string
  setCampaignSortBy: (v: string) => void
  displayCurrency: CurrencyCode
  setDisplayCurrency: (v: CurrencyCode) => void
  filterCountry: string
  setFilterCountry: (v: string) => void
  filterSocialNet: string
  setFilterSocialNet: (v: string) => void
  minBudget: number
  setMinBudget: (v: number) => void
  maxBudget: number
  setMaxBudget: (v: number) => void
  minRequiredSubs: number
  setMinRequiredSubs: (v: number) => void
  maxRequiredSubs: number
  setMaxRequiredSubs: (v: number) => void
  dateFrom: string
  setDateFrom: (v: string) => void
  dateTo: string
  setDateTo: (v: string) => void
  filteredCampaigns: any[]
}) {
  return (
    <div>
      <StatusToast message={toast} />
      <h1 className="text-2xl font-bold text-white mb-2">Маркетплейс</h1>
      <p className="text-white/50 mb-6">Кампании рекламодателей</p>

      <div className="flex gap-2.5 mb-3 flex-wrap items-center">
        <input
          placeholder="Поиск по названию, категории или описанию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="marketplace-search-input flex-1"
          style={{ minWidth: '200px' }}
        />
        <button
          type="button"
          onClick={() => setShowCampaignFilters(!showCampaignFilters)}
          className={`ui-btn ui-btn--sm ${showCampaignFilters ? 'ui-btn--primary' : 'ui-btn--secondary'}`}
        >
          <i className="ti ti-adjustments-horizontal" style={{ fontSize: '14px' }} />
          Фильтры {showCampaignFilters ? '▲' : '▼'}
        </button>
        <FilterDropdown
          value={campaignSortBy}
          onChange={setCampaignSortBy}
          options={CAMPAIGN_SORT_OPTIONS}
          size="sm"
          minWidth={180}
        />
        <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} size="sm" />
      </div>

      {showCampaignFilters && (
        <div className="marketplace-filters-panel">
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <div>
              <FilterLabel>Страна</FilterLabel>
              <FilterDropdown
                value={filterCountry}
                onChange={setFilterCountry}
                options={COUNTRY_FILTER_OPTIONS}
                size="sm"
                minWidth={200}
                fullWidth
              />
            </div>

            <div>
              <FilterLabel>Соцсеть</FilterLabel>
              <FilterDropdown
                value={filterSocialNet}
                onChange={setFilterSocialNet}
                options={SOCIAL_FILTER_OPTIONS}
                size="sm"
                minWidth={200}
                fullWidth
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <FilterLabel>Бюджет (AMD)</FilterLabel>
                <span className="marketplace-filter-range-value">
                  {minBudget.toLocaleString()} — {maxBudget >= 10000000 ? '10M+' : maxBudget.toLocaleString()}
                </span>
              </div>
              <div className="relative h-5 flex items-center">
                <input type="range" min={0} max={10000000} step={10000} value={minBudget}
                  onChange={(e) => setMinBudget(Math.min(Number(e.target.value), maxBudget - 10000))}
                  style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 1 }} />
                <input type="range" min={0} max={10000000} step={10000} value={maxBudget}
                  onChange={(e) => setMaxBudget(Math.max(Number(e.target.value), minBudget + 10000))}
                  style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 2, background: 'transparent' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <FilterLabel>Мин. подписчиков</FilterLabel>
                <span className="marketplace-filter-range-value">
                  {minRequiredSubs.toLocaleString()} — {maxRequiredSubs >= 1000000 ? '1M+' : maxRequiredSubs.toLocaleString()}
                </span>
              </div>
              <div className="relative h-5 flex items-center">
                <input type="range" min={0} max={1000000} step={1000} value={minRequiredSubs}
                  onChange={(e) => setMinRequiredSubs(Math.min(Number(e.target.value), maxRequiredSubs - 1000))}
                  style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 1 }} />
                <input type="range" min={0} max={1000000} step={1000} value={maxRequiredSubs}
                  onChange={(e) => setMaxRequiredSubs(Math.max(Number(e.target.value), minRequiredSubs + 1000))}
                  style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 2, background: 'transparent' }} />
              </div>
            </div>

            <div>
              <FilterLabel>Дата размещения</FilterLabel>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="ui-input flex-1"
                />
                <span className="ui-meta text-xs">—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="ui-input flex-1"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setMinBudget(0)
                setMaxBudget(10000000)
                setMinRequiredSubs(0)
                setMaxRequiredSubs(1000000)
                setDateFrom('')
                setDateTo('')
                setFilterCountry('all')
                setFilterSocialNet('all')
              }}
              className="ui-btn ui-btn--ghost ui-btn--sm"
            >
              Сбросить фильтры
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-white/50 text-center py-24">Загрузка...</div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-24">
          <i className="ti ti-speakerphone" style={{ fontSize: '48px', color: 'rgba(255,255,255,0.25)' }} />
          <div className="text-white font-medium mb-2">Кампаний не найдено</div>
          <div className="text-white/40 text-sm">Попробуй изменить фильтры</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  )
}
