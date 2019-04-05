<template>
  <b-card v-if="view" title="Search results">
    <b-row>
      <b-col cols="9">
        Matches for: <b-badge variant="success">Region = chr6:{{this.start}}-{{this.stop}}</b-badge>
        <b-badge variant="danger">Type = {{this.type}}</b-badge>
        <b-badge variant="warning" v-if="this.overlap">Overlapping >= {{this.overlap}}%</b-badge>
      </b-col>
      <b-col class="text-right" cols="3"><b>Matching patients: </b>{{this.total}}</b-col>
    </b-row>
    <b-row>
      <b-col><br/></b-col>
    </b-row>
  </b-card>
</template>

<script>
export default {
  name: 'SearchResultsSummary',
  props: ['overlap', 'total', 'start', 'stop', 'view', 'type']
}
</script>
